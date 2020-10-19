// This file handles migration/registration, loaded into the background page.

// Perform migration steps, if necessary
(async () => {

  const VERSION_FIRSTRUN = 0;
  const VERSION_CURRENT = 1;
  const {version} = await Msl.get({version: VERSION_FIRSTRUN});
  switch (version) {
    case VERSION_CURRENT:
      break;

    case VERSION_FIRSTRUN:
      // We need to wait for the experiment to initialize the provider. If a
      // better API becomes available (such as an explicit provider
      // registration method), this can be omitted / replaced with something
      // better.
      await new Promise(resolve => setTimeout(resolve, 1000));
      for (let ab of await Mab.list()) {
        await BC.createCalendarForAddressBook(ab);
      }
      await Msl.set({version: VERSION_CURRENT});
      break;

    default:
      throw new Error("Found data of a more recent version. To fix this error,"
          + "install a more recent version of the Birthday Calendar add-on.");
  }
})().catch(console.error);
