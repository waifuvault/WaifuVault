## WaifuVault

WaifuVault is a temporary file hosting service, that allows for file uploads that are hosted for a set amount of time.

The amount of time a given file is hosted for is determined by its size. Files are hosted for a maximum of 365 days,
with the time being shortened on a cubic curve. This means for files up to about 50% of maximum file size will get
close to the maximum time. Beyond that, the time allotted drops off sharply, with the maximum size file getting 30 days
of hosting.

## Getting started

> **Important!** this requires Node >= 14, Express >= 4 and TypeScript >= 4.

`.env` file must be created for this application to work. Rename `.envExample` to `.env`

### Env file settings

Required Settings

| Setting                   | Description                                                                   |
|---------------------------|-------------------------------------------------------------------------------|
| FILE_SIZE_UPLOAD_LIMIT_MB | Limit on size of file allowed to be uploaded                                  |
| SESSION_KEY               | Replace 'YourSessionKey' with a random string to use as the session key       |

> **Note Well** the file size sets the time to live for a file, so files close to the upload limit will only be hosted
> for 30 days. It is a cubic curve so files up to 50% of the size will get close to a year of hosting time.

> **SALT ISSUES - IMPORTANT - PLEASE READ** <br>
> If you change the salt setting after password protected files have been added, you will no longer be able to access
> the files encrypted with the older salt.

Optional Settings

| Setting            | Description                                                                                                                                          |
|--------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| BLOCKED_MIME_TYPES | Comma seperated list of MIME types that will be blocked from being uploaded                                                                          |
| CLAM_PATH          | The path to your Clam Antivirus installation                                                                                                         |
| MS_DEFENDER_PATH   | The path to your MS Defender Antivirus installation                                                                                                  |
| UPLOAD_SECRET      | A secret passcode you can set, when used as on the upload as a query paramater `secret_token`, the file will have no expiry and will persist forever |
| RATE_LIMIT         | If set, this will enable rate limiting, this defines how many requests can be made within the `RATE_LIMIT_MS` period                                 |
| RATE_LIMIT_MS      | If `RATE_LIMIT` is set, then this is required and defines how long to wait for each rate limit reset                                                 |
| REDIS_URI          | Set this if you are using redis. currently this is only used for socket IO when the application is running using node clusters                       |
| CAPTCHA_SERVICE    | Select the captcha service you want to use on login (see list of available values below)                                                             |
| CAPTCHA_SITE_KEY   | The site key from the selected captcha service                                                                                                       |
| CAPTCHA_SECRET_KEY | The secret key from the selected captcha service                                                                                                     |
| SALT               | 8 Characters defining salt for encryption (if not set encryption is disabled)                                                                        |
| MAX_URL_LENGTH     | Maximum URL length that can be specified                                                                                                             |

The available `CAPTCHA_SERVICE` values are:

* turnstile
* reCAPTCHA
* hCaptcha

> For rate limiting, if `RATE_LIMIT` was 1 and `RATE_LIMIT_MS` is `1000`. Then this means 1 request every second
 

> **Google V2 Recaptcha** If you want to use google reCaptcha, then select the non-invisible one.

> **Note Well** if a path to an Antivirus engine is not defined it will not be used, if no paths are defined then no
> antivirus scanning will be used

### Build and Run commands

```batch
# add directories (once after cloning)
    mkdir files

# install dependencies
    npm install
    
# build database
    npm run runmigration

# serve
    npm run start

# build for production
    npm run build
    npm run start:prod
```

## Admin Feature

This application comes with a useful admin site that will allow you to control the files that are uploaded, and to
provide security control with the ability to ban abusive IPs.

The site also features statistics to allow you to at-a-glance see information on the files that have been uploaded.

### Setup

On first startup you need to pay attention to the logs printed to screen - it will provide you with a username and
password that can be used to log in to the admin. This is random and only provided once. The line looks like this:

```batch
New user created: email: "foo@example.com" password: "password" Please change this upon logging in!
```

> **Tip** For first startup run manually, so you can easily find the log file on screen

To get to the admin interface, go to **/login**, where you will provide the
email and password from above.

Once you are logged in, you can click on the **Change Details** button, where you can change the email address
and password.

> **Note Well** It is recommended you change the default username and password at first startup. The system will not
> provide the default password again.

### Usage

Once in the admin, you can see what files have been uploaded and sort them by any of the available columns.
You can also ban and unban IP addresses from here, and download any files that have been uploaded. You can change your
username and password, and can view overall stats on the files that have been uploaded.

### File Management Operations

On the navigation bar at the top, select **File Management** to get to the file management page.

Delete a file, by selecting it and pressing Delete File. You will be asked if you are sure.

![Deleting Files](https://waifuvault.moe/f/1709504564466/DeleteFile.png)

Download a file, by selecting it and pressing Download File.

![Downloading Files](https://waifuvault.moe/f/1709504647173/DownloadFile.png)

Details on a file, by selecting it and pressing Details. The longer fields have copy buttons on them in the details
panel.

![File Details](https://waifuvault.moe/f/1709504743287/FileDetails.png)

### IP Operations

Ban an IP by selecting the file and pressing Ban IP, then confirming you want to ban it and if you want to delete
related files.

![Banning IP Address](https://waifuvault.moe/f/1709504936554/BanIP.png)

Unban an IP by selecting the IP in the lower table and pressing Un Ban, then confirming you want to unban.

![Unban IP Address](https://waifuvault.moe/f/1709504995039/UnBanIP.png)

### Statistics

On the navigation bar at the top, select **Statistics** to get to the statistics page.

This page shows overall statistics for the files uploaded to the site:

* Total Number of Files Uploaded
* Total Size of Files Uploaded
* File Size Distribution of Files Uploaded
* Top 10 Media Types of Files Uploaded
* File Protection Level Distribution

![Statistics](https://waifuvault.moe/f/1709505507674/Stats.png)

### User Account Operations

On the navigation bar at the top, select **User** to get to the user account control page.

You can change the username and password from here.

![Change Account Details](https://waifuvault.moe/f/1709505880404/UserControl.png)

## REST Endpoints

All application functionality is provided by a set of REST endpoints.

| Endpoint             | Description                                                                              |
|----------------------|------------------------------------------------------------------------------------------|
| PUT /rest            | Upload file using either a provided file in form data or a provided URL hosting the file |
| GET /rest/{token}    | Return file information, including URL and time left to live                             |
| DELETE /rest/{token} | Delete file referred to by token                                                         |

## Site URL

> https://waifuvault.moe
