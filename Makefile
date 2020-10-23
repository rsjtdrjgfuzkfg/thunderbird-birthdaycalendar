# Birthday Calendar Add-on for Thunderbird

.PHONY: clean clobber build/version.txt

xpi: dist/birthdaycalendar.xpi

clean:
	rm -Rf build

clobber: clean
	rm -Rf dist

SRCFILES = $(shell find src -not -path 'src/manifest.json')

build/version.txt:
	mkdir -p "$(@D)"
	git describe --match='v[0-9]*' --dirty=+ | sed -e 's/^v//g' > "$@"

build/manifest.json: src/manifest.json build/version.txt
	sed -e "s/__BUILD_version__/$(shell cat build/version.txt)/g" "$<" > "$@"

dist/birthdaycalendar.xpi: $(SRCFILES) build/manifest.json LICENSE
	mkdir -p "$(@D)"
	rm -f "$@"
	cd src ; zip -r "../$@" *
	cd build ; zip "../$@" manifest.json
	zip "$@" LICENSE

