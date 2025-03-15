# Birthday Calendar add-on for Thunderbird

An add-on to create Thunderbird calendars that dynamically contain the birthdays stored in address book(s). You can [download stable releases through addons.thunderbird.net](https://addons.thunderbird.net/thunderbird/addon/birthday-calendar/). Alternatively, binary builds for named versions are also available [on the releases page of this repository](https://github.com/rsjtdrjgfuzkfg/thunderbird-birthdaycalendar/releases).


## Compatibility

**This add-on officially supports the Extended Support Release (ESR) channel of Thunderbird.** For a seamless and stable user experience, compatibility updates are planned to land before each major ESR release. If you use the ESR release channel and have automatic updates enabled, Thunderbird will ensure that a compatible version is installed at any time.

All other channels, including the new monthly "release" channel, do not receive official support. That said, pull requests that provide compatibility fixes for other versions are welcome, if they do not interfere with ESR releases.

To protect you and your data, regular releases of the add-on cannot be enabled on unsupported versions of Thunderbird. Advanced users that understand the risks involved may use unsupported builds that can be installed on newer versions of Thunderbird. As the name implies, unsupported builds do not receive any form of support from the add-on author and are not published as automatic updates. Do not open issues or otherwise ask the add-on author for support when using an unsupported build.

Beware: While unsupported builds may seemingly work as intended, incompatible changes in Thunderbird might affect some or all functionality of the add-on and may lead to severe issues, even beyond the add-on's scope. In extreme cases, using unsupported builds could lead to irrecoverable loss of data. If you do not understand the risks involved, don't have a tested and relieable backup strategy, or don't want the hassle of updating the add-on manually, you should use supported releases with an ESR version of Thunderbird.


## Note for add-on developers

This add-on is using an experiment based on the [upcoming Calendar API](https://github.com/thundernest/tb-web-ext-experiments/tree/main/calendar), but is otherwise a pure WebExtension. Please note that the bundled experiment in this repository may not contain the latest changes of the official API draft. If you want to create your own add-on using the Calendar API, you should consider to start with the latest official version.


## Building

On a system with common unix tools installed, you can use `make` to create an xpi archive containing the add-on in the dist folder. For an unsupported build, use `make xpi-unsupported` instead.

Alternatively, you can directly use the add-on from the `src` folder or pack that folder into an xpi yourself.
