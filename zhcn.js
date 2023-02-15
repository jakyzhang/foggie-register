var axios = require("axios");
const imaps = require("imap-simple");
const _ = require("lodash");
const inquirer = require("inquirer");
var fs = require("fs");
var path = require("path");

const mailFrom = "vfoggieadmin@vofocorp.com";
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
      console.log("[注册] 请求发送Foggie注册邮件到: " + email);
      return true;
    }
  } catch (error) {
    console.log("[错误] 请求发送Foggie注册邮件到失败: " + email, error);
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
      console.log("[成功]发送登陆邮件成功: " + email);
      return true;
    }

    return false;
  } catch (error) {
    console.log("[错误] 发送登陆邮件失败: " + email, error);
    return false;
  }
}

async function sendLink(email, promo_code) {
  promo_code = promo_code || "xTnTsf";

  //first check if email is already registered
  console.log("[注册] 检查邮箱是否已经被注册: " + email);
  const isVerified = await checkUserVerified(email, promo_code);

  if (isVerified) {
    console.log("[注册] 已注册，发送登陆邮件: " + email);
    return await sendLoginLink(email);
  } else {
    console.log("[注册] 未注册，发送注册邮件: " + email);
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
  if (!imapConfig) {

    //read imap.config in current dir
    var imapConfigFile = path.join(process.cwd(), "imap.json");
    if (fs.existsSync(imapConfigFile)) {
      console.log("[邮箱]读取本地IMAP配置文件: " + imapConfigFile );
      imapConfig = JSON.parse(fs.readFileSync(imapConfigFile, "utf8"));
    } 
  }

  if (!imapConfig) { 
    console.log("[邮箱]未找到IMAP配置, 使用默认配置,可以在当前目录创建imap.json文件,配置host, port, tls参数");
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

  try {
    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");
    const searchCriteria = [
      "UNSEEN",
      ["SINCE", new Date(Date.now() - 5 * 60 * 1000)],
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

      console.log("邮件标题: " + subject);

      if (subject != mailSubject || from != mailFrom) {
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
    console.log("[错误] 从邮件中读取登陆链接失败： " + err);
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
      console.log("[错误] 登陆链接已经超时，请重新获取");
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
    console.log("[钱包] 创建的钱包信息: " + JSON.stringify(walletInfo));
    dmc = walletInfo.account;
    data.dmc = dmc;
    dmc.wallet_type = 'wallet';
    console.log("[修改资料] 自动绑定DMC钱包账号到 : " + dmc);
  }

  const res = await axios.put(url, data, { headers });
  if (res.data.result) {
    console.log("[注册] 资料修改成功");
    return true;
  } else {
    console.log("[错误]  资料修改失败");
    return false;
  }
}

async function foggieRegister(email, emailPwd, promo_code, foggiePwd,wallet) {
  var sendOk = await sendLink(email, promo_code);
  if (!sendOk) {
    return false;
  }

  var regLink = null;

  while (true) {
    regLink = await getLink(email, emailPwd);
    if (regLink) {
      break;
    }
    console.log("[找邮件] 未找到邮件，5秒后重试...");
    await sleep(5000);
  }

  console.log("[注册] 成功找到链接 " + regLink.substring(0, 40) + "...");
  console.log("[注册] 开始访问链接");

  var user = await getJwtTokensByLink(regLink);
  if (user == null) {
    console.log("[错误] 从链接无法获取用户信息");
    return false;
  }

  let walletInfo = null;
  if(wallet){
    console.log("[钱包] 开始创建DMC钱包...");
    //get email prefix
    var emailPrefix = (email.split("@")[0]).substring(0, 5).trim();
    //if email prefix is not match a-z1-5, use default prefix
    if(!emailPrefix.match(/^[a-z1-5]+$/)){
      emailPrefix = null;
    }

    walletInfo = await createWallet(emailPrefix).catch((err) => {
      console.log("[错误] 生成DMC钱包时发生了错误: " + err);
      return null;
    });
  }

  var result = await updateFoggieProfile(user, foggiePwd,walletInfo);
  if (result) {
    console.log(`[成功] ${email} 注册成功 @ ${new Date()}`);
    return {
      email: email,
      password: foggiePwd,
      wallet: walletInfo,
    };
  } else {
    console.log(`[错误] ${email} 注册失败 @ ${new Date()}`);
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
      console.log("[邮箱]读取本地IMAP配置文件: " + imapConfigFile );
      imapConfig = JSON.parse(fs.readFileSync(imapConfigFile, "utf8"));
    } 
  }

  if (!imapConfig) { 
    console.log("[邮箱]未找到IMAP配置, 使用默认配置,可以在当前目录创建imap.json文件,配置host, port, tls参数");
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
    var nftFrom = "vfoggieadmin@vofocorp.com"

    for (const item of messages) {
      const headers = _.find(item.parts, { which: "HEADER" });      
      const from = headers.body.from[0];
      const subject = headers.body.subject[0];
      
      if (from != nftFrom || subject != nftSubject) {
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
    console.log("[错误] 解析NFT链接时发生了错误: " + err);
  }

  if (nftCode) {
    console.log("[成功] 找到发送至 " + email + " 的 NFT CODE: " + nftCode);
  } else {
    console.log("[错误] 在" + email + " 中没有找到NFT CODE,请重试，或确认是否已领到小狗");
  }

  return nftCode;
}


async function listChoice(choice) {
  const promptList = [
    {
      type: "list",
      message: "请用方向键选择功能?",
      name: "choice",
      default: choice,
      choices: [
        new inquirer.Separator(),
        {
          key: "1",
          name: "1). 输入邮箱和密码注册",
          value: "Single",
        },
        {
          key: "2",
          name: "2). 从邮箱文件批量注册",
          value: "File",
        },
        {
          key: "3",
          name: "3). 从单个邮箱获取Foggie NFT code",
          value: "NFT",
        },
        {
          key: "4",
          name: "3). 从邮箱文件批量获取Foggie NFT code",
          value: "NFTFile",
        },
        {
          key: "5",
          name: "4). 退出",
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
    console.log("按任意键退出");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", process.exit.bind(process, 0));
  }
}

async function main() {
  console.log("----------------------------------------");
  console.log("Foggie账号全自动注册 v0.1 By Tagge001");
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
          message: "输入邮箱账号:",
          name: "email",
          required: true,
        },
        {
          type: "input",
          message: "输入邮箱密码:",
          name: "emailPwd",
          required: true,
        },
        {
          type: "input",
          message: "输入邀请码:",
          name: "promo_code",
          required: true,
          default: "xTnTsf",
        },
        {
          type: "input",
          message: "输入要修改的Foggie登陆密码:",
          name: "foggiePwd",
          required: false,
          default: "123qweASD",
        },
        {
          type: "confirm",
          message: "是否自动生成新的DMC钱包并绑定 y/n:",
          name: "wallet",
          required: false,
          default: true,
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
        result.wallet
      ).then((res) => {
        if (res) {
          var file = `${email}_result.txt`;
          console.log("[成功] 注册成功，结果文件保存到 " + file);
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
          console.log("[错误] 注册失败");
        }
      });
    } else if (choice == "File") {
      var schema = [
        {
          type: "input",
          message:
            "输入邮箱账号文件,格式为：邮箱账号\t邮箱密码:",
          name: "emailFile",
          default: "email.txt",
          required: true,
        },
        {
          type: "input",
          message: "输入邀请码:",
          name: "promo_code",
          required: true,
          default: "xTnTsf",
        },
        {
          type: "input",
          message: "输入要修改的Foggie登陆密码:",
          name: "foggiePwd",
          required: false,
          default: "123qweASD",
        },
        {
          type: "confirm",
          message: "是否自动生成新的DMC钱包并绑定 y/n:",
          name: "wallet",
          required: false,
          default: true,
        },
      ];

      var result = await inquirer.prompt(schema);

      var emailFile = result.emailFile;
      var promo_code = result.promo_code;
      var foggiePwd = result.foggiePwd;
      var wallet = result.wallet;

      //check if file end with .txt
      if (!emailFile.endsWith(".txt")) {
        console.log(`[错误] ${emailFile} 不是txt文件`);
        continue;
      }

      //first check file exist in current dir
      if (!fs.existsSync(emailFile)) {
        console.log(`[错误] ${emailFile} 不存在`);
        continue;
      }

      var breakFlag = process.platform === "win32" ? "\r" : "\n";
      var emails = fs.readFileSync(emailFile, "utf-8").split(breakFlag);
      if (emails.length == 0) {
        console.log(`[错误] ${emailFile} 里面没有邮箱`);
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
        console.log(`[注册] [${i + 1}/${emails.length}] ${email}] @ ${new Date()}`);
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
          message: "请输入邮箱账号:",
          name: "email",
          required: true,
        },
        {
          type: "input",
          message: "请输入邮箱密码:",
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
          message:"输入邮箱账号文件，每行一个邮箱，格式为：邮箱账号\t邮箱密码:",
          name: "emailFile",
          default: "email.txt",
          required: true,
        }
      ];

      var result = await inquirer.prompt(schema);

      var emailFile = result.emailFile;
      
      //check if file end with .txt
      if (!emailFile.endsWith(".txt")) {
        console.log(`[错误] ${emailFile} 不是txt文件`);
        continue;
      }

      //first check file exist in current dir
      if (!fs.existsSync(emailFile)) {
        console.log(`[错误] ${emailFile} 不存在`);
        continue;
      }

      var breakFlag = process.platform === "win32" ? "\r" : "\n";
      var emails = fs.readFileSync(emailFile, "utf-8").split(breakFlag);
      if (emails.length == 0) {
        console.log(`[错误] ${emailFile} 里面没有邮箱`);
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
        console.log(`[开始查找NFTCODE] [${i + 1}/${emails.length}] ${email}] @ ${new Date()}`);
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