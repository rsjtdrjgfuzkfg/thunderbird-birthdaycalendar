# Birthday Calendar Add-on for Thunderbird

.PHONY: clean clobber

xpi: dist/birthdaycalendar.xpi

clean:

clobber: clean
	rm -Rf dist

SRCFILES = $(shell find src)

dist/birthdaycalendar.xpi: $(SRCFILES) LICENSE
	mkdir -p "$(@D)"
	rm -f "$@"
	cd src ; zip -r "../$@" *
	zip -r "$@" LICENSE

