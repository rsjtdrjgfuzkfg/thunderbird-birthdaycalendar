// This file contains the calendar provider implementation only; loaded into the
// background page.

Mc.provider.onSync.addListener(async (cal) => {
  let ab; // the (complete) address book associated with the calendar
  try {
    ab = await Mab.get(BC.getAddressBookIdFromCalendarURL(cal.url), true);
  } catch (e) {
    // Automatically remove calendars whose address books were deleted
    await Mc.calendars.remove(cal.id);
    throw e;
  }

  await Mc.calendars.clear(cal.cacheId);
  for (let contact of ab.contacts) {
    const bDay = contact.properties.BirthDay;
    const bMonth = contact.properties.BirthMonth;
    if (!bDay || !bMonth) {
      continue; // Skip contacts without birthday
    }

    // TODO: use the simple calendar format instead of ical generation, once it
    // supports repetition and whole-day-events.
    const icalStrip = s => s.replace(/\n\\,;/g, "");
    const zeroPad = (s, d) => s.toString().padStart(d || 2, "0");
    const icalDate = d => "DATE:" + zeroPad(d.getFullYear(), 4)
        + zeroPad(d.getMonth() + 1) + zeroPad(d.getDate());

    let ical = "BEGIN:VCALENDAR\nBEGIN:VEVENT\n";
    ical += "UID:" + icalStrip(contact.id) + "\n";

    const name = contact.properties.DisplayName || contact.id;
    const bYear = contact.properties.BirthYear;
    ical += "SUMMARY:" + icalStrip(name + (bYear ? " (" + bYear + ")" : ""))
        + "\n";

    // If we do not know a birth year, we will assume 1972, as that is the first
    // leap year of the unix epoch (we need a leap year in order to correctly
    // process birthdays on 29th of February).
    let firstInstance = new Date(bYear || 1972, bMonth - 1, bDay);
    if (bYear < 100) { // unlikely, but just in case...
      firstInstance.setFullYear(bYear);
    }
    ical += "DTSTART;VALUE=" + icalDate(firstInstance) + "\n";
    firstInstance.setDate(firstInstance.getDate() + 1);
    ical += "DTEND;VALUE=" + icalDate(firstInstance) + "\n";
    ical += "TRANSP:TRANSPARENT\n";
    ical += "RRULE:FREQ=YEARLY\n";

    ical += "END:VEVENT\nEND:VCALENDAR\n";

    await Mc.items.create(cal.cacheId, {
      type: "event",
      formats: {
        use: "ical",
        ical: ical
      }
    });
  }
});
