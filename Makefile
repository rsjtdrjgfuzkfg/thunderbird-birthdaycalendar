# Birthday Calendar Add-on for Thunderbird

.PHONY: clean clobber

xpi: dist/birthdaycalendar.xpi

clean:
	rm -Rf build

clobber: clean
	rm -Rf dist

SRCFILES := $(shell find src -type f \
	-not -path 'src/manifest.json' \
	-not -name '.*' \
	)

build/version.txt: .git/index $(SRCFILES) LICENSE
	mkdir -p "$(@D)"
	git describe --match='v[0-9]*' --dirty=+ | sed -e 's/^v//g' > "$@"

build/manifest.json: src/manifest.json build/version.txt
	sed -e "s/__BUILD_version__/$(shell cat build/version.txt)/g" "$<" > "$@"

dist/birthdaycalendar.xpi: $(SRCFILES) build/manifest.json LICENSE
	mkdir -p "$(@D)"
	rm -f "$@"
	cd src ; zip -9X "../$@" $(SRCFILES:src/%=%)
	cd build ; zip -9X "../$@" manifest.json
	zip -9X "$@" LICENSE

