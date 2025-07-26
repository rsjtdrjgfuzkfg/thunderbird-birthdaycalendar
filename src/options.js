// Options page script

// The default cutoff year offered when enabling the feature; 1604 has been
// suggested in issue #17 as suitable value to work around iOS and MS office
// enforcing a concrete birth year if no actual year is known.
const defaultAgeCutoffYear = 1604;

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

  document.body.appendChild(document.createElement("hr"));

  const abListLabel = document.createElement("p");
  abListLabel.textContent = Mi.getMessage("addressBookSelection");
  document.body.appendChild(abListLabel);

  abList = document.createElement("div");
  document.body.appendChild(abList);
  
  // Reminder section
  // Add a separator line and label for reminder selection
  document.body.appendChild(document.createElement("hr"));
  const remListLabel = document.createElement("p");
  remListLabel.textContent = Mi.getMessage("ReminderSelection") || "Reminder selection:";
  document.body.appendChild(remListLabel);
  
  // Container for the reminder checkboxes
  const remList = document.createElement("div");
  document.body.appendChild(remList);
  
  // Define your three distinct reminder options with keys and labels
  const reminderOptions = [
    { key: "reminderMinus1Week",   label: "Reminder at 7:00 AM, 1 week before" },
    { key: "reminderMinus6Hours",  label: "Reminder at 6:00 PM the day before (−6 hours)" },
    { key: "reminderPlus7Hours",   label: "Reminder at 7:00 AM on the day (+7 hours)" },
    { key: "reminderPlus18Hours",  label: "Reminder at 6:00 PM on the day (+18 hours)" },
  ]; // if this list is changed you need to change:
  //         - BC.getGlobalSettings = async function()  in common.js 
  //         - buildRemindersAlarms in provider.js
  
  for (const option of reminderOptions) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
  
    // Initialize state from settings, default false
    checkbox.checked = !!settings[option.key];
  
    // Store setting key to use in event handler
    checkbox.dataset.settingKey = option.key;
  
    // Accessibility: link label with checkbox
    const checkboxId = `checkbox_${option.key}`;
    checkbox.id = checkboxId;
    label.htmlFor = checkboxId;
  
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + option.label));
    remList.appendChild(label);
  
    // Save setting on checkbox toggle
	checkbox.addEventListener("click", async () => {
      try {
        settings[checkbox.dataset.settingKey] = checkbox.checked;
        await BC.setGlobalSettings(settings);
        //console.log("Settings saved:", settings);
        // we need to sync the calendars
        await Mc.calendars.synchronize();
      } catch (e) {
        console.error("Error saving settings:", e);
      }
    });
  }

  // end of Reminder section

  Mc.calendars.onRemoved.addListener(refreshAbList);
  Mc.calendars.onCreated.addListener(refreshAbList);
  Mab.onCreated.addListener(refreshAbList);
  Mab.onDeleted.addListener(refreshAbList);
  await refreshAbList();
})().catch(console.error), {once: true});

