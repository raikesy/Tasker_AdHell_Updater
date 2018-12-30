// AdHell 3 update checker script
// TODO: Rearrange for tidiness including async function extraction

// Replacement global functions
const global = varName => {
  const value = localStorage.getItem(varName);
  return value !== null ? value : "";
};
const setGlobal = (varName, value) => {
  localStorage.setItem(varName, value);
};

// Utility functions
const addParams = (endpoint, params) =>
  Object.keys(params).reduce((acc, cur) => {
    acc.searchParams.append(cur, params[cur]);
    return acc;
  }, endpoint);

// Check local_rev and initialise if necessary
if (global("LOCAL_REV") === "") {
  console.log("No local revision stored, setting to zero");
  setGlobal("LOCAL_REV", 0);
} else console.log(`Local revision stored at ${global("LOCAL_REV")}`);

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

fetch(requestUrl)
  .then(response => response.json())
  .then(data => {
    if (data.response.result !== "Success")
      throw new Error(`API Error: ${data.response.message}`);
    const latestApiVersion = data.response.current_api_version;

    if (latestApiVersion > apiVersion)
      console.warn(
        `API version outdated. Using: ${apiVersion}, latest: ${latestApiVersion}`
      );

    // console.log(JSON.stringify(data, null, "\t"));
    const remoteRev = data.response.folder_info.revision;
    // console.log(`Current folder revision: ${remoteRev}`);

    if (remoteRev > global("LOCAL_REV")) {
      console.log("New folder revision exists:", remoteRev);

      const getContentPath = `/api/${apiVersion}/folder/get_content.php`;
      const getContentParams = { ...params, content_type: "files" };

      const contentRequestUrl = addParams(
        new URL(getContentPath, serverUrl),
        getContentParams
      );

      fetch(contentRequestUrl)
        .then(response => response.json())
        .then(contentData => {
          if (contentData.response.asynchronous === "yes" || contentData.response.more_chunks === "yes")
            throw new Error("Unexpected response parameters");
          console.log(contentData)
        });
    } else console.log("No new folder revision");
  })
  .catch(err => console.error(err));
