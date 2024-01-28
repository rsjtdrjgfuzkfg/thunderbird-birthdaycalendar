// This file provides common constants and methods used both on the background
// page and in other scopes within the WebExtension.


// Shorthands for WebExtension APIs
let Mc = messenger.calendar;
let Mab = messenger.addressBooks;
let Msl = messenger.storage.local;
let Mi = messenger.i18n;

// Object filled with goodies from this file, see below
const BC = {};

{
  // Work around Thunderbird bug preventing option pages from accessing WX APIs
  (async () => {
    const bg = await messenger.runtime.getBackgroundPage();
    Mc = bg.messenger.calendar;
    Mab = bg.messenger.addressBooks;
    Msl = bg.messenger.storage.local;
    Mi = bg.messenger.i18n;
  })().catch(console.error);

  // Calendar URL <> Address book ID Mapping
  const URL_PREFIX =
      "com.rsjtdrjgfuzkfg.birthdaycalendar:thunderbird-addressbook/";

  BC.getAddressBookIdFromCalendarURL = function(calendarURL) {
    if (!calendarURL.startsWith(URL_PREFIX)) {
      throw new Error("Invalid URL for birthday calendar: " + calendarURL);
    }
    return decodeURIComponent(calendarURL.substr(URL_PREFIX.length));
  };

  BC.getCalendarURLForAddressBookId = function(addressBookId) {
    return URL_PREFIX + encodeURIComponent(addressBookId);
  };


  // Managing birthday calendars for address books
  BC.calendarType = "ext-" + messenger.runtime.id;

  BC.hasCalendarForAddressBookId = async function(addressBookId) {
    const url = BC.getCalendarURLForAddressBookId(addressBookId);
    const calendarInfo = { type: BC.calendarType, url: url };
    return (await Mc.calendars.query(calendarInfo)).length > 0;
  };

  BC.createCalendarForAddressBook = async function(addressBook) {
    const url = BC.getCalendarURLForAddressBookId(addressBook.id);
    let calendarInfo = { type: BC.calendarType, url: url };
    if ((await Mc.calendars.query(calendarInfo)).length > 0) {
      return false; // there is an existing calendar
    }
    calendarInfo.name = Mi.getMessage("defaultCalendarName",
        [addressBook.name]);
    calendarInfo.color = "#ffff00";
    await Mc.calendars.create(calendarInfo);
    return true;
  };

  BC.removeCalendarForAddressBookId = async function(addressBookId) {
    const url = BC.getCalendarURLForAddressBookId(addressBookId);
    const calendarInfo = { type: BC.calendarType, url: url };
    const existingCalendars = await Mc.calendars.query(calendarInfo);
    await Promise.all(existingCalendars.map(c => Mc.calendars.remove(c.id)));
    return existingCalendars.length > 0;
  };
  
  // Calculate dates
  BC.getTimestamp = function(year, month, day, hours, minutes, seconds) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const hh = String(hours).padStart(2, '0');
    const min = String(minutes).padStart(2, '0');
    const sec = String(seconds).padStart(2, '0');
    const bdate = year + '-' + mm + '-' + dd + 'T' + hh + ':' + min + ':' + sec;
    return Math.floor(new Date(bdate).getTime());
  }
  BC.getDiffDays = function(TS_Midnight, TS_Now, days, delaySecs) {
    let diffDelay = TS_Now - (days*24*60*60*1000);
    let diff = diffDelay - TS_Midnight + (delaySecs * 1000);

    let daysDiff = Math.floor(diff/1000/60/60/24);
    diff -= daysDiff*1000*60*60*24;
    let hoursDiff = Math.floor(diff/1000/60/60);
    diff -= hoursDiff*1000*60*60;
    let minutesDiff = Math.floor(diff/1000/60);
    diff -= minutesDiff*1000*60;
    let secondsDiff = Math.floor(diff/1000);
    /*
    console.log('Diff = ' +
      daysDiff + ' day/s ' +
      hoursDiff + ' hour/s ' +
      minutesDiff + ' minute/s ' +
      secondsDiff + ' second/s ');
    */

    diff = "PT";
    if (daysDiff < 0){
      daysDiff = Math.abs(daysDiff);
      hoursDiff = Math.abs(23 - hoursDiff);
      minutesDiff = Math.abs(59 - minutesDiff);
      secondsDiff = Math.abs(59 - secondsDiff);
      if (daysDiff > 1) {
        daysDiff -= 1;
        diff = "-P" + daysDiff +"DT";
      } else {
        diff = "-PT";
      }
    }
    diff += hoursDiff + "H" + minutesDiff + 'M'+ secondsDiff + 'S';
    
    return diff;
  }


  // Settings
  BC.getGlobalSettings = async function() {
    return await Msl.get({
      yearsToDisplayAgeFor: 2,
      ageCutoffYear: null,
      daysRemind: 0
    });
  };

  BC.setGlobalSettings = async function(settings) {
    await Msl.set(settings);
  };
}
