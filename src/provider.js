// This file contains the calendar provider implementation only; loaded into the
// background page.

Mc.provider.onSync.addListener(async (cal) => {
  let ab = null; // the (complete) address book associated with the calendar
  let errorCount = 0;
  while (!ab) {
    try {
      ab = await Mab.get(BC.getAddressBookIdFromCalendarURL(cal.url), true);
    } catch (e) {
      // Retry for up to 60 seconds, if the address book is not ready yet.
      if (++errorCount <= 60) {
        console.warn("Cannot access address book for " + cal.url
            + ", retrying in 1000ms", e);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      // If that does not help, remove the calendar and log the error.
      console.error("Fatal: Cannot access address book for " + cal.url
            + ", giving up and removing the calendar", e);
      await Mc.calendars.remove(cal.id);
      throw e;
    }
  }

  // We cannot use the more simple event representation of the Calendar API,
  // as it does not support repetitions, exceptions or whole-day events yet.
  // We also can't use recurrence exceptions, and simulate them with RDATEs
  // and separate events (as the calendar API draft does not permit access to
  // recurrence exceptions in any way). [October 2020]
  const icalStrip = s => s.replace(/\n\\,;/g, "");
  const zeroPad = (s, d) => s.toString().padStart(d || 2, "0");
  const icalDate = d => zeroPad(d.getFullYear(), 4) + zeroPad(d.getMonth() + 1)
      + zeroPad(d.getDate());
  const icalUTZTime = d => zeroPad(d.getUTCFullYear(), 4)
     + zeroPad(d.getUTCMonth() + 1) + zeroPad(d.getUTCDate()) + "T"
     + zeroPad(d.getUTCHours()) + zeroPad(d.getUTCMinutes())
     + zeroPad(d.getUTCSeconds()) + "Z";

  const now = new Date();
  const dtStamp = "DTSTAMP:" + icalUTZTime(now) + "\n";

  const settings = await BC.getGlobalSettings();
  const ageStartYear = now.getFullYear() - Math.max(
      settings.yearsToDisplayAgeFor - 1, 0);
  const ageEndYear = now.getFullYear() + settings.yearsToDisplayAgeFor;

  await Mc.calendars.clear(cal.cacheId);
  for (let contact of ab.contacts) {
    let bDay = null;
    let bMonth = null;
    let bYear = null;
    if (contact.properties.hasOwnProperty("vCard")) {
      // Thunderbird 102+ introduced raw vCard access and deprecated the use
      // of Birth* properties. We thus prefer vCard if present, though we only
      // use some regexes as proper vCard parsing would be overkill:
      let birthdayMatch = contact.properties.vCard.match("[\r\n]"
          // Select BDAY property, but ignore params
          + "BDAY(?:;[a-zA-Z=;]*)?:"
          // per RFC 6350 and assuming the type is DATE or DATE-TIME, there are
          // two relevant date formats (there are others that do not include
          // both day and month, but we're not interested in them):
          // YYYYMMDD (ISO 8601:2004 4.1.2.2 basic)
          // --MMDD   (ISO 8601:2000 5.2.1.3 d basic)
          + "(--|[0-9]{4})([0-9]{2})([0-9]{2})"
          // which can be optionally followed by a time separated by 'T'
          + "(?:T[0-9Z-]*)?[\r\n]");
      if (birthdayMatch) {
        bYear = parseInt(birthdayMatch[1]);
        bMonth = parseInt(birthdayMatch[2]);
        bDay = parseInt(birthdayMatch[3]);
      }
    } else {
      // Thunderbird 91 provided direct access to the birthday
      bYear = parseInt(contact.properties.BirthYear);
      bMonth = parseInt(contact.properties.BirthMonth);
      bDay = parseInt(contact.properties.BirthDay);
    }
    if (!bDay || !bMonth) {
      continue; // Skip contacts without birthday
    }
    if (settings.ageCutoffYear && bYear <= settings.ageCutoffYear) {
      bYear = NaN;
    }

    const joinNameParts = (a, b) => a ? b ? a + " " + b : a : b;
    const name = '\u{1F382} ' + contact.properties.DisplayName || joinNameParts(
        contact.properties.FirstName, contact.properties.LastName)
        || contact.properties.PrimaryEmail || contact.id;

    let years; // array with all years that get an event for this birthday
    if (bYear) {
      years = [bYear];
      for (let year = Math.max(ageStartYear, bYear + 1); year < ageEndYear;
          ++year) {
        years.push(year);
      }
    } else {
      // If we do not know a birth year, we will assume 1972, as that is the
      // first leap year of the unix epoch (we need a leap year in order to
      // correctly process birthdays on 29th of February).
      years = [1972];
    }

    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    const nowHours = now.getHours();
    const nowMin = now.getMinutes();
    const nowSec = now.getSeconds();
    for (let year of years) {
      let instanceDate = new Date(year, bMonth - 1, bDay);
      if (instanceDate < 100) { // unlikely, but just in case...
        instanceDate.setFullYear(year);
      }

      let ical = "BEGIN:VCALENDAR\nVersion:2.0\n";
      ical += "BEGIN:VEVENT\n";
      ical += "UID:" + icalStrip(contact.id) + "-" + year + "\n" + dtStamp;

      ical += "SUMMARY:" + icalStrip(name);
      if (year > bYear) {
        // This is an exception to the regular event, containing the exact
        // age for this particular year
        ical += (bYear ? " (" + (year - bYear) + ")" : "") + "\n";
        // If we had recurrence exception support, we'd also add
        // "RECURRENCE-ID;VALUE=DATE:" + icalDate(instanceDate) + "\n"
      } else {
        // This is the main event with the recurrence rule. Contains the birth
        // year iff it is set and we do not display ages anywhere
        if (!settings.yearsToDisplayAgeFor && bYear) {
          ical += " (" + bYear + ")";
        }
        ical += "\nRRULE:FREQ=YEARLY\n";
        // As we don't have real recurrence exceptions, we need to explicitly
        // exclude all dates with 'exceptions' in the main event:
        if (years.length > 1) {
          for (let exYear of years) {
            if (exYear === year) {
              continue;
            }
            ical += "EXDATE;VALUE=DATE:" + icalDate(new Date(exYear, bMonth - 1,
                bDay)) + "\n";
          }
        }
      }

      ical += "DTSTART;VALUE=DATE:" + icalDate(instanceDate) + "\n";
      instanceDate.setDate(instanceDate.getDate() + 1);
      ical += "DTEND;VALUE=DATE:" + icalDate(instanceDate) + "\n";
      ical += "TRANSP:TRANSPARENT\n";

      // Add reminder for current and next month only
      if ((year === nowYear && (bMonth === nowMonth || bMonth === nowMonth + 1)) ||
          (year === nowYear + 1 && bMonth === 1 && nowMonth === 12)) {
        if (!isNaN(settings.daysRemind) && settings.daysRemind >= 0) {
          ical += "BEGIN:VALARM\n";
          let triggerDays = settings.daysRemind;
          if (triggerDays < 0) {
            triggerDays = -triggerDays;
          }

          let TS_bday = BC.getTimestamp(year, bMonth, bDay, 0, 0, 0);
          let TS_bday_now = BC.getTimestamp(year, bMonth, bDay, nowHours, nowMin, nowSec);
          let trigger = BC.getDiffDays(TS_bday, TS_bday_now, triggerDays, 5);  // Add little delay of few sec
          ical += "TRIGGER:" + trigger + "\n";

          ical += "ACTION:DISPLAY\n";
          ical += "DESCRIPTION:" + Mi.getMessage("BirthdayOf") +" " + icalStrip(name) + "\n";
          ical += "END:VALARM\n";
        }
      }

      ical += "END:VEVENT\n";
      ical += "END:VCALENDAR\n";
      await Mc.items.create(cal.cacheId, {
        type: "event",
        formats: {
          use: "ical",
          ical: ical,
        },
      });
    }
  }
});
