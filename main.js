// AdHell 3 update checker script
// How it works:
//   Polls folder revision. If revision is newer:
//   Polls folder content. If any of the files are new:
//   Check if its AdHell (3.1.x, non-themed)
//   If yes, check version and notify for app update if available
//   If no, just list the new filenames with links
//   Mechanism for acknowledging new files so they don't show up again
//     Maintain an array of quickkeys, only update them
// TODO: Rearrange for tidiness including async function extraction
// TODO: Set up a better deployment mechanism

// "use strict"; // TODO: Does Tasker need this?

// setGlobal("LOCAL_VER", "");

// Utility functions
const addParams = (endpoint, params) =>
  Object.keys(params).reduce((acc, cur) => {
    acc.searchParams.append(cur, params[cur]);
    return acc;
  }, endpoint);

const globalArr = arrName => {
  const arr = global(arrName).split(",");
  return arr.length === 1 && arr[0] === "" ? [] : arr;
};
const setGlobalArr = (arrName, arr) => setGlobal(arrName, arr.join(","));

const main = async () => {
  // Check for first run and initialise global variables
  if (global("LOCAL_VER") === "") {
    flash("First run detected. Prompting for AdHell version...");
    setGlobal(
      "LOCAL_VER",
      prompt("Enter current AdHell version:", "3.1.1.242")
    );
    setGlobal("LOCAL_REV", 0);
    setGlobalArr("LOCAL_QUICKKEYS", []); // Global arrays must be strings
  }
  flash(
    `Current folder revision: ${global("LOCAL_REV")}
  Current app version: ${global("LOCAL_VER")}
  Quickkeys:`,
    globalArr("LOCAL_QUICKKEYS")
  );

  // Set initial variables
  const folderKey = "sb37c6gmhqgbn";
  const apiVersion = 1.5;

  // Fetch folder revision
  const serverUrl = "https://www.mediafire.com";
  const getInfoPath = `/api/${apiVersion}/folder/get_info.php`;
  const params = {
    folder_key: folderKey,
    response_format: "json"
  };

  const requestUrl = addParams(new URL(getInfoPath, serverUrl), params);

  // TODO: Refactor success errors into a single class for both requests

  const infoData = await (await fetch(requestUrl)).json();

  /**
   * @param infoData.response.current_api_version
   * @param infoData.response.folder_info
   * @param infoData.response.folder_info.revision
   */

  if (infoData.response.result !== "Success")
    throw new Error(`API Error: ${infoData.response.message}`);
  const latestApiVersion = infoData.response.current_api_version;

  if (latestApiVersion > apiVersion)
    flash(
      `API version outdated. Using: ${apiVersion}, latest: ${latestApiVersion}`
    );

  // flash(JSON.stringify(data, null, "\t"));
  const remoteRev = infoData.response.folder_info.revision;

  if (remoteRev > global("LOCAL_REV")) {
    flash(`New folder revision exists: ${remoteRev}`);

    const getContentPath = `/api/${apiVersion}/folder/get_content.php`;
    const getContentParams = { ...params, content_type: "files" };

    const contentRequestUrl = addParams(
      new URL(getContentPath, serverUrl),
      getContentParams
    );

    const contentData = await (await fetch(contentRequestUrl)).json();
    /**
     * @param contentData.response.asynchronous
     * @param contentData.response.folder_content
     * @param contentData.response.folder_content.more_chunks
     */
    if (contentData.response.result !== "Success")
      throw new Error(`API Error: ${contentData.response.message}`);
    if (
      contentData.response.asynchronous !== "no" ||
      contentData.response.folder_content.more_chunks !== "no"
    )
      throw new Error("Unexpected response parameters");

    // Convert file array into a map
    const remoteFileMap = new Map(
      contentData.response.folder_content.files.map(
        ({ quickkey, ...value }) => [quickkey, value]
      )
    );

    const newKeys = [...remoteFileMap.keys()].filter(
      key => !globalArr("LOCAL_QUICKKEYS").includes(key)
    );
    const newNames = newKeys.map(key => remoteFileMap.get(key).filename);

    // Now we look for the right file with regex
    // First identify the correct filename

    const latestVer = newNames.reduce((acc, curr) => {
      const reg = curr.match(/^ah3_v(?!3.0.0.155)([\d.]+)_[\d\w]{8}\.apk$/);
      return reg !== null ? reg[1] : acc;
    }, "");

    flash(newNames.join("\n"));
    flash(latestVer);
  } else flash("No new folder revision. Task complete.");
};

main()
  .catch(err => alert(err.message))
  .finally(exit);
