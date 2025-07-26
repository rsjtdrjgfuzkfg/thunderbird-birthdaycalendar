// This file contains the calendar provider implementation only; loaded into the
// background page.

//start of crc
function makeCRCTable() {
  let c;
  let crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
}
// create table only once while loading
const crcTable = makeCRCTable();
// CRC32 calculation
function crc32(str) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}
function getCRC_8hex(str) {// 8 hex digits form string
  return crc32(str).toString(16).toUpperCase().padStart(8, '0');
}
//end of crc

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
  const ageStartYear = now.getFullYear() - Math.max(settings.yearsToDisplayAgeFor - 1, 0);
  const ageEndYear = now.getFullYear() + settings.yearsToDisplayAgeFor;

  
  // get all the existing calendar entries before script starts
  let existing_events = await messenger.calendar.items.query({
  calendarId: cal.id,
  type: "event" 
  });
  //to do - today it seems the only information we do get from calendar events is the id
  //due to this we can not update events but use a crc to delete and recreate in case of a data changed.
  
  for (let contact of ab.contacts) { // iterate all contacts
    let bDay = null;
    let bMonth = null;
    let bYear = null; //b means the actual birth year
    if (contact.properties.hasOwnProperty("vCard")) {
      // Thunderbird 102+ introduced raw vCard access and deprecated the use
      // of Birth* properties. We thus prefer vCard if present, though we only
      // use some regexes as proper vCard parsing would be overkill:
      let birthdayMatch = contact.properties.vCard.match("[\r\n]"
          // Select BDAY property, but ignore params
          + "BDAY(?:;(?:[^\":]|\"[^\"]*\")*)?:"
          // per RFC 6350 and assuming the type is DATE or DATE-TIME, there are
          // two relevant date formats (there are others that do not include
          // both day and month, but we're not interested in them):
          // YYYYMMDD (ISO 8601:2004 4.1.2.2 basic)
          // --MMDD   (ISO 8601:2000 5.2.1.3 d basic)
          + "(--|[0-9]{4})([0-9]{2})([0-9]{2})"
          // which can be optionally followed by a time separated by 'T'
          + "(?:T[0-9Z-]*)?[\r\n]");
      if (birthdayMatch) {
        bYear = parseInt(birthdayMatch[1])
        bMonth = parseInt(birthdayMatch[2])
        bDay = parseInt(birthdayMatch[3])
      }
    } else {
      // Thunderbird 91 provided direct access to the birthday
      bYear = parseInt(contact.properties.BirthYear)
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
    const name = contact.properties.DisplayName || joinNameParts(
        contact.properties.FirstName, contact.properties.LastName)
        || contact.properties.PrimaryEmail || contact.id;
	let years; // array with all years that get an event for this birthday
    if (bYear) {
      years = [bYear];
      for (let year = Math.max(ageStartYear, bYear + 1); year < ageEndYear; ++year) {
        years.push(year);
      }
    } else {
      // If we do not know a birth year, we will assume 1972, as that is the
      // first leap year of the unix epoch (we need a leap year in order to
      // correctly process birthdays on 29th of February).
	  // and as we do not know the birth year we do not calculate the age
      years = [1972];
    }

	
    for (let year of years) {
      let instanceDate = new Date(year, bMonth - 1, bDay);
      if (instanceDate < 100) { // unlikely, but just in case...
        instanceDate.setFullYear(year);
      }

      let ical = "BEGIN:VCALENDAR\nVersion:2.0\n";
      ical += "BEGIN:VEVENT\n";
      ical += dtStamp;

      let ical_data = "SUMMARY:" + icalStrip(name);
      if (year > bYear) {
        // This is an exception to the regular event, containing the exact
        // age for this particular year
        ical_data += (bYear ? " (" + (year - bYear) + ")" : "") + "\n";
        // If we had recurrence exception support, we'd also add
        // "RECURRENCE-ID;VALUE=DATE:" + icalDate(instanceDate) + "\n"
      } else {
        // This is the main event with the recurrence rule. Contains the birth
        // year if it is set and we do not display ages anywhere
        if (!settings.yearsToDisplayAgeFor && bYear) { // in case the age is not calculated at all the regular event will show the birth year if set.
          ical_data += " (" + bYear + ")";
        }
        ical_data += "\nRRULE:FREQ=YEARLY\n";
        // As we don't have real recurrence exceptions, we need to explicitly
        // exclude all dates with 'exceptions' in the main event:
        if (years.length > 1) {
          for (let exYear of years) {
            if (exYear === year) {
              continue;
            }
            ical_data += "EXDATE;VALUE=DATE:" + icalDate(new Date(exYear, bMonth - 1,
                bDay)) + "\n";
          }
        }
      }

      ical_data += "DTSTART;VALUE=DATE:" + icalDate(instanceDate) + "\n";
      instanceDate.setDate(instanceDate.getDate() + 1);
      ical_data += "DTEND;VALUE=DATE:" + icalDate(instanceDate) + "\n";
      
	  //calculate a crc from data and add it to the UID
	  //a change in data will change the UID and therefor trigger a recreation of the event.
	  let ical_data_crc = getCRC_8hex(ical_data); // 8 digit hex crc32
	  let ical_id =  icalStrip(contact.id) + "-" + year + "-" + ical_data_crc  ;
	  ical += "UID:" + ical_id + "\n";
	  ical+= ical_data;
	  
	  ical += "TRANSP:TRANSPARENT\n";
      ical += "END:VEVENT\n";
      ical += "END:VCALENDAR\n";
	  
	  
	  // Check if ical_id exists in existing_events
      const existingIndex = existing_events.findIndex(g_event => g_event.id === ical_id);
      
      if (existingIndex !== -1) {
        // Event already exists -> remove it from the list
		existing_events.splice(existingIndex, 1);
      } else {
        // Event does not exist -> create a new event
		await Mc.items.create(cal.cacheId, {
          type: "event",
          format: "ical",
          item: ical
        });
      }
    }
  }
  
  // now we processed all contacts, created new events, and removed already existing from existing_events
  // in the existing_events we do have events we do not need anymore.
  for (let g_event of existing_events) {
    // Delete the event by id
    await Mc.items.remove(cal.cacheId, g_event.id);
  }
  
});
