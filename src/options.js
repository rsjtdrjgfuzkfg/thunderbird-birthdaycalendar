// Options page script

let abList; // div containing the list of address books

async function refreshAbList() {
  while (abList.firstChild) {
    abList.removeChild(abList.firstChild);
  }

  for (let ab of await Mab.list()) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = await BC.hasCalendarForAddressBookId(ab.id);
    checkbox.addEventListener("click", () => (async () =>{
      if (checkbox.checked) {
        await BC.createCalendarForAddressBook(ab);
      } else {
        await BC.removeCalendarForAddressBookId(ab.id);
      }
    })().catch(console.error));
    const label = document.createElement("label");
    label.textContent = ab.name;
    label.insertBefore(checkbox, label.firstChild);
    abList.appendChild(label);
  }
}

addEventListener('load', () => (async () => {
  const separator = '$this string is unlikely to occur in any locale file@';
  let settings = await BC.getGlobalSettings();

  const ageYearsLabel = document.createElement("label");
  const ageYearsText1 = ageYearsLabel.appendChild(document.createTextNode(""));
  const ageYearsText2 = document.createTextNode("");
  const updateAgeYearsText = async function() {
    const currentYear = (new Date()).getFullYear();
    const years = settings.yearsToDisplayAgeFor;
    const placeholders = [
      currentYear - Math.max(years - 1, 0),
      currentYear + years - 1
    ];
    const rangeText = Mi.getMessage("ageCalculationRange"
        + (years > 1 ? "" : years == 1 ? "CurrentYear" : "None"), placeholders);
    ageYearsText1.textContent = Mi.getMessage("ageCalculationRangeSetting1",
        [rangeText]);
    ageYearsText2.textContent = Mi.getMessage("ageCalculationRangeSetting2",
        [rangeText]);
  };
  updateAgeYearsText();
  const ageYearsSpinner = document.createElement("input");
  ageYearsSpinner.type = "number";
  ageYearsSpinner.min = 0;
  ageYearsSpinner.max = 100;
  ageYearsSpinner.value = settings.yearsToDisplayAgeFor;
  ageYearsSpinner.addEventListener("change", () => (async () => {
    const newValue = parseInt(ageYearsSpinner.value);
    if (!(newValue >= 0) || settings.yearsToDisplayAgeFor === newValue) {
      return;
    }
    settings.yearsToDisplayAgeFor = newValue;
    await BC.setGlobalSettings(settings);
    updateAgeYearsText();
    await Mc.calendars.synchronize();
  })().catch(console.error));
  ageYearsLabel.appendChild(ageYearsSpinner);
  ageYearsLabel.appendChild(ageYearsText2);
  document.body.appendChild(ageYearsLabel);

  document.body.appendChild(document.createElement("hr"));

  const abListLabel = document.createElement("p");
  abListLabel.textContent = Mi.getMessage("addressBookSelection");
  document.body.appendChild(abListLabel);

  abList = document.createElement("div");
  document.body.appendChild(abList);

  Mc.calendars.onRemoved.addListener(refreshAbList);
  Mc.calendars.onCreated.addListener(refreshAbList);
  Mab.onCreated.addListener(refreshAbList);
  Mab.onDeleted.addListener(refreshAbList);
  await refreshAbList();
})().catch(console.error), {once: true});

