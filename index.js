var axios = require("axios");
const imaps = require("imap-simple");
const _ = require("lodash");
const inquirer = require("inquirer");
var fs = require("fs");
var path = require("path");

const mailFrom = "vofocorp.com";
const mailSubject = "Virtual Foggie System User Verification";

const UserAgent ="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome//110.0.0.0 Safari/537.36";

const {createWallet} = require("./wallet");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkUserVerified(email, promo_code) {
  try {
    const response = await axios.post(
      "https://foggie.fogworks.io/api/accounts/user",
      {
        register_type: "email",
        email: email,
        redirect: "https://foggie.fogworks.io",
        promo_code: promo_code,
      },
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7",
          "content-type": "application/json",
          "sec-ch-ua":
            '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
        },
        referrer: "https://foggie.fogworks.io/",
        referrerPolicy: "strict-origin-when-cross-origin",
        withCredentials: true,
      }
    );

    const isVerified = response.data.data.is_verified;
    return isVerified;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function sendRegLink(email, promo_code) {
  const url = "https://foggie.fogworks.io/api/accounts/user";
  const data = {
    register_type: "email",
    email: email,
    redirect: "https://foggie.fogworks.io",
    promo_code: promo_code,
  };

  var headers = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7",
    "User-Agent": UserAgent,
    "Content-Type": "application/json",
    Origin: "https://foggie.fogworks.io",
    Referer: "https://foggie.fogworks.io/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };

  var options = {
    url: url,
    headers: headers,
    data: data,
    method: "post",
    json: true,
  };

  try {
    const response = await axios(options);
    if (response && response.data && response.data.code == 200) {
      console.log("[REG-01] send register email success: " + email);
      return true;
    }
  } catch (error) {
    console.log("[ERROR] send register email failed: " + email, error);
    return false;
  }
}

async function sendLoginLink(email) {
  const url = "https://foggie.fogworks.io/api/accounts/email_login";
  const data = {
    email: email,
    redirect: "https://foggie.fogworks.io",
  };

  var headers = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7",
    "User-Agent": UserAgent,
    "Content-Type": "application/json",
    Origin: "https://foggie.fogworks.io",
    Referer: "https://foggie.fogworks.io/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };

  var options = {
    url: url,
    headers: headers,
    data: data,
    method: "post",
    json: true,
  };

  try {
    const response = await axios(options);
    if (response && response.data && response.data.code == 200) {
      console.log("[REG] send login email success: " + email);
      return true;
    }

    return false;
  } catch (error) {
    console.log("[ERROR] send login email failed: " + email, error);
    return false;
  }
}

async function sendLink(email, promo_code) {
  promo_code = promo_code || "xTnTsf";

  console.log("[REG] check if email is already registered: " + email);
  const isVerified = await checkUserVerified(email, promo_code);

  if (isVerified) {
    console.log("[REG] email is already registered: " + email);
    return await sendLoginLink(email);
  } else {
    console.log("[REG] send reg email: " + email);
    return await sendRegLink(email, promo_code);
  }
}

const KnownEmailImapConfig = {
  "outlook.com": {
    host: "imap-mail.outlook.com",
  },
  "hotmail.com": {
    host: "imap-mail.outlook.com",
  },
  "live.com": {
    host: "imap-mail.outlook.com",
  },
  "gmail.com": {
    host: "imap.gmail.com",
  },
  "yahoo.com": {
    host: "imap.mail.yahoo.com",
  }
};

async function getLink(email, password) {

  email = email.trim();
  const domain = email.split("@")[1];
  let imapConfig = KnownEmailImapConfig[domain];
  console.log("imap config for domain : " + domain, imapConfig);
  if (!imapConfig) {

    //read imap.config in current dir
    var imapConfigFile = path.join(process.cwd(), "imap.json");
    if (fs.existsSync(imapConfigFile)) {
      console.log("read local imap config file : " + imapConfigFile );
      imapConfig = JSON.parse(fs.readFileSync(imapConfigFile, "utf8"));
    } 
  }

  if (!imapConfig) { 
    console.log("not found imap config for domain : " + domain + ", use default imap config");
    imapConfig = {
      host: "imap." + domain,
    }
  }

  const config = {
    imap: {
      user: email,
      password: password,
      host: imapConfig.host,
      port: imapConfig.port || 993,
      tls: imapConfig.tls !== false ? true : false,
      authTimeout: 6000,
    },
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");
    const searchCriteria = [
      "UNSEEN"
    ];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      markSeen: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    let regLink = null;
    for (const item of messages) {
      const headers = _.find(item.parts, { which: "HEADER" });
      const subject = headers.body.subject[0];
      const from = headers.body.from[0];

      console.log("subject: " + subject + ", from: " + from);
      if(subject.indexOf(mailSubject) == -1 || from.indexOf(mailFrom) == -1) {
        continue;
      }

      const all = _.find(item.parts, { which: "TEXT" });
      const body = all.body;

      if (body.indexOf("Content-Transfer-Encoding: base64") == -1) {
        continue;
      }

      let base64Body = body.split("Content-Transfer-Encoding: base64")[1];
      base64Body = base64Body.replace(/(\r\n|\n|\r)/gm, "");
      const html = Buffer.from(base64Body, "base64").toString("utf-8");

      regLink = html.split("click to sign in")[0];
      regLink = regLink.split('href="')[1];
      regLink = regLink.replace(/(\r\n|\n|\r)/gm, "");
      regLink = regLink.replace(/">/gm, "");
      break;
    }
    return regLink;
  } catch (err) {
    console.log("Get reg link failed: " + err);
  }
}

async function getJwtTokensByLink(regLink) {
  const url = regLink;
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7",
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
  };

  const options = {
    url: url,
    headers: headers,
    method: "get",
    maxRedirects: 0,
    validateStatus: function (status) {
      return status >= 200 && status < 400;
    },
  };

  try {
    const response = await axios(options);
    var html = response.data;
    if (html.indexOf("link is expired") != -1) {
      console.log("[ERROR] Link is expired");
      return null;
    }

    const cookies = response.headers["set-cookie"];

    let access_token = cookies
      .filter((item) => item.includes("access_token"))[0]
      .split(";")[0]
      .split("=")[1];
    let refresh_token = cookies
      .filter((item) => item.includes("refresh_token"))[0]
      .split(";")[0]
      .split("=")[1];
    let uid = cookies
      .filter((item) => item.includes("user_id"))[0]
      .split(";")[0]
      .split("=")[1];
    let username = cookies
      .filter((item) => item.includes("username"))[0]
      .split(";")[0]
      .split("=")[1];

    return {
      access_token: access_token,
      refresh_token: refresh_token,
      uid: uid,
      username: username,
    };
  } catch (error) {
    console.log("[ERROR] get jwt tokens failed: " + error);
  }
}

async function updateFoggieProfile(user, foggiePwd,walletInfo) {
  const url = `https://foggie.fogworks.io/api/accounts/user/${user.uid}`;
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7",
    "Content-Type": "application/json;charset=UTF-8",
    Authorization: `bearer ${user.access_token}`,
    Connection: "keep-alive",
    Cookie: `is_verified=False; refresh_token=${user.refresh_token}; Admin-Token=bearer%20${user.access_token}`,
    Origin: "https://foggie.fogworks.io",
    Referer: "https://foggie.fogworks.io/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": UserAgent,
    "sec-ch-ua":
      '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
  };

  const data = {
    email: user.email,
    mobile: "",
    remark: "",
    username: user.username,
    password: foggiePwd,
    confirm: foggiePwd,
  };

  if(walletInfo) {
    console.log("[WALLET] DMC Wallet Address: " + JSON.stringify(walletInfo));
    dmc = walletInfo.account;
    data.dmc = dmc;
    dmc.wallet_type = 'wallet';
    console.log("[MODIFY] bind wallet id : " + dmc);
  }

  const res = await axios.put(url, data, { headers });
  if (res.data.result) {
    console.log("[REG] modify profile success");
    return true;
  } else {
    console.log("[REG] modify profile failed");
    return false;
  }
}

async function foggieRegister(email, emailPwd, promo_code, foggiePwd,wallet) {
  var sendOk = await sendLink(email, promo_code);
  if (!sendOk) {
    console.log("[ERROR] send link failed");
    return false;
  }

  var regLink = null;

  while (true) {
    regLink = await getLink(email, emailPwd);
    if (regLink) {
      break;
    }
    console.log("[NOT FOUND] Wait 5s to retrieve link...");
    await sleep(5000);
  }

  console.log("[REG] find link: " + regLink.substring(0, 40) + "...");
  console.log("[REG] access link to get jwt tokens...");

  var user = await getJwtTokensByLink(regLink);
  if (user == null) {
    console.log("[ERROR] get jwt tokens failed");
    return false;
  }

  let walletInfo = null;
  if(wallet){
    console.log("[WALLET] Generate DMC Wallet Address...");
    
    var emailPrefix = (email.split("@")[0]).substring(0, 5).trim();
    if(!emailPrefix.match(/^[a-z1-5]+$/)){
      emailPrefix = null;
    }
    walletInfo = await createWallet(emailPrefix).catch((err) => {
      console.log("[ERROR] Create DMC Wallet Failed: " + err);
      return null;
    });
  }

  var result = await updateFoggieProfile(user, foggiePwd,walletInfo);
  if (result) {
    console.log(`[SUCCESS] ${email} register success @ ${new Date()}`);
    return {
      email: email,
      password: foggiePwd,
      wallet: walletInfo,
    };
  } else {
    console.log(`[ERROR] ${email} register failed @ ${new Date()}`);
    return null;
  }
}


async function foggieNFTCode(email, password) {
  
  email = email.trim();
  const domain = email.split("@")[1];
  let imapConfig = KnownEmailImapConfig[domain];
  if (!imapConfig) {

    //read imap.config in current dir
    var imapConfigFile = path.join(process.cwd(), "imap.json");
    if (fs.existsSync(imapConfigFile)) {
      console.log("read local imap config file : " + imapConfigFile );
      imapConfig = JSON.parse(fs.readFileSync(imapConfigFile, "utf8"));
    } 
  }

  if (!imapConfig) { 
    console.log("not found imap config for domain : " + domain + ", use default imap config");
    imapConfig = {
      host: "imap." + domain,
    }
  }

  const config = {
    imap: {
      user: email,
      password: password,
      host: imapConfig.host,
      port: imapConfig.port || 993,
      tls: imapConfig.tls !== false ? true : false,
      authTimeout: 30000,
    },
  };
  let nftCode = null;
  try {
    const connection = await imaps.connect(config);

    await connection.openBox("INBOX");
    const searchCriteria = [
      "ALL",
    ];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      markSeen: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    var nftSubject = "Virtual Foggie System NFT KEY"
    var nftFrom = "@vofocorp.com"

    for (const item of messages) {
      const headers = _.find(item.parts, { which: "HEADER" });      
      const from = headers.body.from[0];
      const subject = headers.body.subject[0];
      
      if (from.indexOf(nftFrom) == -1 || subject.indexOf(nftSubject) == -1) {
          continue;
      }
      
      const all = _.find(item.parts, { which: "TEXT" });
      const body = all.body;

      if (body.indexOf("Content-Transfer-Encoding: base64") == -1) {
        continue;
      }

      let base64Body = body.split("Content-Transfer-Encoding: base64")[1];
      base64Body = base64Body.replace(/(\r\n|\n|\r)/gm, "");
      const html = Buffer.from(base64Body, "base64").toString("utf-8");

      //<div class="email_text">NFT KEY is:<b> 788e0ec7fd332b932056f1a1953f89d3 </b></div> 
      //get nft code
      nftCode = html.split("NFT KEY is:<b>")[1];
      nftCode = nftCode.split("</b></div>")[0];
      nftCode = nftCode.replace(/(\r\n|\n|\r)/gm, "");
      nftCode = nftCode.replace(/ /gm, "");
    }
  } catch (err) {
    console.log("Get NFT link failed: " + err);
  }

  if (nftCode) {
    console.log("[FIND] " + email + " NFT CODE: " + nftCode);
  } else {
    console.log("[NOTFOUND] " + email + "has not received NFT code");
  }

  return nftCode;
}


async function listChoice(choice) {
  const promptList = [
    {
      type: "list",
      message: "What are you going to do?",
      name: "choice",
      default: choice,
      choices: [
        new inquirer.Separator(),
        {
          key: "1",
          name: "1). Register single account by input.",
          value: "Single",
        },
        {
          key: "2",
          name: "2). Register accounts from file.",
          value: "File",
        },
        {
          key: "3",
          name: "3). Get Foggie NFT code.",
          value: "NFT",
        },
        {
          key: "4",
          name: "3). Get Foggie NFT code from file",
          value: "NFTFile",
        },
        {
          key: "5",
          name: "4). Quit",
          value: "Quit",
        },
        new inquirer.Separator(),
      ],
    },
  ];

  var resp = await inquirer.prompt(promptList).then((answers) => {
    return answers.choice;
  });

  return resp;
}

function waitForInputIfWindows() {
  if (process.platform === "win32") {
    console.log("Press any key to exit");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", process.exit.bind(process, 0));
  }
}

async function main() {
  console.log("----------------------------------------");
  console.log("Welcome to Foggie Auto Register Tool v1.0.0 (By Tagge001)");
  console.log("----------------------------------------");
  var choice = null;
  while (true) {
    choice = await listChoice(choice);
    if (choice == "Quit") {
      console.log("Bye!");
      break;
    } else if (choice == "Single") {
      var schema = [
        {
          type: "input",
          message: "Please input the email:",
          name: "email",
          required: true,
        },
        {
          type: "input",
          message: "Please input the email password:",
          name: "emailPwd",
          required: true,
        },
        {
          type: "input",
          message: "Please input the promo code:",
          name: "promo_code",
          required: true,
          default: "xTnTsf",
        },
        {
          type: "input",
          message: "Please input the foggie password:",
          name: "foggiePwd",
          required: false,
          default: "123qweASD",
        },
        {
          type: "input",
          message: "Generate new wallet y/n:",
          name: "wallet",
          required: false,
          default: "y",
        }
      ];

      var result = await inquirer.prompt(schema);
      var email = result.email;
      var emailPwd = result.emailPwd;
      var foggiePwd = result.foggiePwd;
      
      await foggieRegister(
        result.email,
        result.emailPwd,
        result.promo_code,
        result.foggiePwd,
        result.wallet.toLowerCase() == "y" ? true : false
      ).then((res) => {
        if (res) {
          var file = `${email}_result.txt`;
          console.log("[SUCCESS] Register success,save to file " + file);
          var line = null;
          if(res.wallet) {
            var wallet = res.wallet;
            line = `${email}\t${emailPwd}\t${foggiePwd}\t${wallet.account}\t${wallet.privateKey}`;
          } else {
            line = `${email}\t${emailPwd}\t${foggiePwd}`;
          }
          console.log(line);
          fs.writeFileSync(file, line);
        } else {
          console.log("[ERROR] Register failed");
        }
      });
    } else if (choice == "File") {
      var schema = [
        {
          type: "input",
          message:
            "Please input emails file path: <email password> in each line:",
          name: "emailFile",
          default: "email.txt",
          required: true,
        },
        {
          type: "input",
          message: "Please input the promo code:",
          name: "promo_code",
          required: true,
          default: "xTnTsf",
        },
        {
          type: "input",
          message: "Please input the foggie password:",
          name: "foggiePwd",
          required: false,
          default: "123qweASD",
        },
        {
          type: "input",
          message: "Generate allet y/n:",
          name: "wallet",
          required: false,
          default: "y",
        },
      ];

      var result = await inquirer.prompt(schema);

      var emailFile = result.emailFile;
      var promo_code = result.promo_code;
      var foggiePwd = result.foggiePwd;
      var wallet = result.wallet.toLowerCase() == "y" ? true : false;

      //check if file end with .txt
      if (!emailFile.endsWith(".txt")) {
        console.log(`[ERROR] ${emailFile} is not a txt file`);
        continue;
      }

      //first check file exist in current dir
      if (!fs.existsSync(emailFile)) {
        console.log(`[ERROR] ${emailFile} not exist`);
        continue;
      }

      var breakFlag = process.platform === "win32" ? "\r" : "\n";
      var emails = fs.readFileSync(emailFile, "utf-8").split(breakFlag);
      if (emails.length == 0) {
        console.log(`[ERROR] ${emailFile} is empty`);
        continue;
      }

      var savedFile = emailFile.replace(".txt", "_success_" + new Date().getTime()+".txt");
      var failedFile = emailFile.replace(".txt", "_failed_" + new Date().getTime()+".txt");

      for (var i = 0; i < emails.length; i++) {
        var line = emails[i].trim().split(/\s+/);
        if (line.length != 2) {
           continue;
        }
        var email = line[0];
        var emailPwd = line[1];

        if (email == "" || emailPwd == "") {
            continue;
        }
        console.log("-------------------------------");
        console.log(`[REG] [${i + 1}/${emails.length}] ${email}] @ ${new Date()}`);
        var result = await foggieRegister(
          email,
          emailPwd,
          promo_code,
          foggiePwd,
          wallet
        );
        if (result) {
          var line = null;
          if(result.wallet) {
            var wallet = result.wallet;
            line = `${email}\t${emailPwd}\t${foggiePwd}\t${wallet.account}\t${wallet.privateKey}${breakFlag}`;
          } else {
            line = `${email}\t${emailPwd}\t${foggiePwd}${breakFlag}`;
          }
          fs.appendFileSync(savedFile, line);
        } else {
          var line = `${email}\t${emailPwd}${breakFlag}`;
          fs.appendFileSync(failedFile, line);
        }
      }
    } else if (choice == "NFT") {
      var schema = [
        {
          type: "input",
          message: "Please input the email:",
          name: "email",
          required: true,
        },
        {
          type: "input",
          message: "Please input the email password:",
          name: "emailPwd",
          required: true,
        },
      ];

      var result = await inquirer.prompt(schema);
      var email = result.email;
      var emailPwd = result.emailPwd;
      
      await foggieNFTCode(
        result.email,
        result.emailPwd,
      ).then((res) => {
      });
    }else if (choice == "NFTFile") {
      var schema = [
        {
          type: "input",
          message:
            "Please input emails file path: <email password> in each line:",
          name: "emailFile",
          default: "email.txt",
          required: true,
        }
      ];

      var result = await inquirer.prompt(schema);

      var emailFile = result.emailFile;
      
      //check if file end with .txt
      if (!emailFile.endsWith(".txt")) {
        console.log(`[ERROR] ${emailFile} is not a txt file`);
        continue;
      }

      //first check file exist in current dir
      if (!fs.existsSync(emailFile)) {
        console.log(`[ERROR] ${emailFile} not exist`);
        continue;
      }

      var breakFlag = process.platform === "win32" ? "\r" : "\n";
      var emails = fs.readFileSync(emailFile, "utf-8").split(breakFlag);
      if (emails.length == 0) {
        console.log(`[ERROR] ${emailFile} is empty`);
        continue;
      }

      var savedFile = emailFile.replace(".txt", "_nft_success_" + new Date().getTime()+".txt");
      var failedFile = emailFile.replace(".txt", "_nft_notfound_" + new Date().getTime()+".txt");

      for (var i = 0; i < emails.length; i++) {
        var line = emails[i].trim().split(/\s+/);
        if (line.length != 2) {
           continue;
        }
        var email = line[0];
        var emailPwd = line[1];

        if (email == "" || emailPwd == "") {
            continue;
        }
        console.log("-------------------------------");
        console.log(`[FIND-NFT-CODE] [${i + 1}/${emails.length}] ${email}] @ ${new Date()}`);
        var result = await foggieNFTCode(
          email,
          emailPwd
        );
        if (result) {
          var line = `${email}\t${result}${breakFlag}`;
          fs.appendFileSync(savedFile, line);
        } else {
          var line = `${email}\t${emailPwd}${breakFlag}`;
          fs.appendFileSync(failedFile, line);
        }
      }
    }
  }
}

main()
  .then(() => {
    waitForInputIfWindows();
  })
  .catch((error) => {
    console.log(error);
    waitForInputIfWindows();
});