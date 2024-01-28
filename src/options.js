// Options page script

// The default cutoff year offered when enabling the feature; 1604 has been
// suggested in issue #17 as suitable value to work around iOS and MS office
// enforcing a concrete birth year if no actual year is known.
const defaultAgeCutoffYear = 1604;

const defaultReminder = 0;

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
      currentYear + years - 1,
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

  const ageCutoffLabel = document.createElement("label");
  const ageCutoffCheckbox = document.createElement("input");
  ageCutoffCheckbox.type = "checkbox";
  ageCutoffCheckbox.checked = !!settings.ageCutoffYear;
  ageCutoffLabel.appendChild(ageCutoffCheckbox);
  ageCutoffLabel.appendChild(document.createTextNode(Mi.getMessage(
      "ageCutoffYear1")));
  const ageCutoffYear = document.createElement("input");
  ageCutoffYear.type = "number";
  ageCutoffYear.min = 1;
  ageCutoffYear.max = 3000;
  ageCutoffYear.value = settings.ageCutoffYear ?? defaultAgeCutoffYear;
  ageCutoffYear.disabled = !settings.ageCutoffYear;
  ageCutoffLabel.appendChild(ageCutoffYear);
  ageCutoffLabel.appendChild(document.createTextNode(Mi.getMessage(
      "ageCutoffYear2")));
  document.body.appendChild(ageCutoffLabel);
  const ageCutoffUpdate = () => (async () => {
    if (ageCutoffCheckbox.checked) {
      settings.ageCutoffYear = ageCutoffYear.value;
      ageCutoffYear.disabled = false;
    } else {
      settings.ageCutoffYear = null;
      ageCutoffYear.disabled = true;
    }
    await BC.setGlobalSettings(settings);
  })().catch(console.error);
  ageCutoffYear.addEventListener("change", ageCutoffUpdate);
  ageCutoffCheckbox.addEventListener("click", ageCutoffUpdate);

  const daysReminderLabel = document.createElement("label");
  const reminderCheckbox = document.createElement("input");
  reminderCheckbox.type = "checkbox";
  reminderCheckbox.checked = !!settings.daysRemind;
  daysReminderLabel.appendChild(reminderCheckbox);
  daysReminderLabel.appendChild(document.createTextNode(Mi.getMessage(
      "daysReminder")));
  const daysRemind = document.createElement("input");
  daysRemind.type = "number";
  daysRemind.min = 0;
  daysRemind.max = 21;
  daysRemind.value = settings.daysRemind ?? defaultReminder;
  daysRemind.disabled = !settings.daysRemind;
  daysReminderLabel.appendChild(daysRemind);
  document.body.appendChild(daysReminderLabel);
  const daysRemindUpdate = () => (async () => {
    if (reminderCheckbox.checked) {
      settings.daysRemind = daysRemind.value;
      daysRemind.disabled = false;
    } else {
      settings.daysRemind = NaN;
      daysRemind.disabled = true;
    }
    await BC.setGlobalSettings(settings);
  })().catch(console.error);
  daysRemind.addEventListener("change", daysRemindUpdate);
  reminderCheckbox.addEventListener("click", daysRemindUpdate);

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
