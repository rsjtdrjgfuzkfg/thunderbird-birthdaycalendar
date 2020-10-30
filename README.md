# Birthday Calendar add-on for Thunderbird

An add-on to create Thunderbird calendars that dynamically contain the birthdays stored in address book(s). You can [download stable releases through addons.thunderbird.net](https://addons.thunderbird.net/thunderbird/addon/birthday-calendar/). Alternatively, binary builds for named versions are also available [on the releases page of this repository](https://github.com/rsjtdrjgfuzkfg/thunderbird-birthdaycalendar/releases).


## Note for add-on developers

This add-on is using an experiment based on the [upcoming Calendar API](https://github.com/thundernest/tb-web-ext-experiments/tree/master/calendar), but is otherwise a pure WebExtension. Please note that the bundled experiment in this repository may not contain the latest changes of the official API draft. If you want to create your own add-on using the Calendar API, you should consider to start with the latest official version.


## Building

On a system with common unix tools installed, you can use `make` to create an xpi archive containing the add-on in the dist folder.

Alternatively, you can directly use the add-on from the `src` folder or pack that folder into an xpi yourself.
