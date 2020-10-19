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
    checkbox.addEventListener('click', () => (async () =>{
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
  const label = document.createElement("p");
  label.textContent = Mi.getMessage("addressBookSelection");
  document.body.appendChild(label);

  abList = document.createElement("div");
  document.body.appendChild(abList);

  Mc.calendars.onRemoved.addListener(refreshAbList);
  Mc.calendars.onCreated.addListener(refreshAbList);
  Mab.onCreated.addListener(refreshAbList);
  Mab.onDeleted.addListener(refreshAbList);
  await refreshAbList();
})().catch(console.error), {once: true});

