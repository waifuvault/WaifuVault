## WaifuVault

WaifuVault is a temporary file hosting service, that allows for file uploads that are hosted for a set amount of time.

The amount of time a given file is hosted for is determined by its size. Files are hosted for a maximum of 365 days,
with the time being shortened on a cubic curve. This means for files up to about 50% of maximum file size will get
close to the maximum time. Beyond that, the time allotted drops off sharply, with the maximum size file getting 30 days
of hosting.

## Getting started

> **Important!** This requires Docker, Node >= 20 and TypeScript >= 5.5

`.env` file must be created for this application to work. Rename `.envExample` to `.env`

#### Postgres

> **Important!** If you are using postgres, read the following, these settings will be used by docker-compose to create
> the image

You mut create a file called `postgres.env` and fill in the following info

| Setting           | Description                                                      |
|-------------------|------------------------------------------------------------------|
| POSTGRES_USER     | The user to authenticate with pg                                 |
| POSTGRES_PASSWORD | The user to authenticate with pg                                 |
| POSTGRES_DB       | The DB to use                                                    |
| POSTGRES_PORT     | The port PG will use (defaults to `5004` if using docker-compose | 

If you are using PG in the supplied docker-compose file, the port above must reflect those in the docker file

___

This service also has a dependency on Redis, this can be started using the docker-compose file

### Env file settings

Required Settings

| Setting                   | Description                                                             |
|---------------------------|-------------------------------------------------------------------------|
| FILE_SIZE_UPLOAD_LIMIT_MB | Limit on size of file allowed to be uploaded                            |
| SESSION_KEY               | Replace 'YourSessionKey' with a random string to use as the session key |
| PORT                      | The port the service will listen on                                     |
| BASE_URL                  | The base URL of the site                                                |
| REDIS_URI                 | The URI for redis, this can be kept at "redis://localhost:6379"         |

> **Note Well** the file size sets the time to live for a file, so files close to the upload limit will only be hosted
> for 30 days. It is a cubic curve so files up to 50% of the size will get close to a year of hosting time.

> **SALT ISSUES - IMPORTANT - PLEASE READ** <br>
> If you change the salt setting after password protected files have been added, you will no longer be able to access
> the files encrypted with the older salt.

Optional Settings

| Setting                | Description                                                                                                                                                                                                                                                                                           |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| BLOCKED_MIME_TYPES     | Comma seperated list of MIME types that will be blocked from being uploaded                                                                                                                                                                                                                           |
| CLAM_PATH              | The path to your Clam Antivirus installation                                                                                                                                                                                                                                                          |
| MS_DEFENDER_PATH       | The path to your MS Defender Antivirus installation                                                                                                                                                                                                                                                   |
| UPLOAD_SECRET          | A secret passcode you can set, when used as on the upload as a query paramater `secret_token`, the file will have no expiry and will persist forever                                                                                                                                                  |
| RATE_LIMIT             | If set, this will enable rate limiting, this defines how many requests can be made within the `RATE_LIMIT_MS` period                                                                                                                                                                                  |
| RATE_LIMIT_MS          | If `RATE_LIMIT` is set, then this is required and defines how long to wait for each rate limit reset                                                                                                                                                                                                  |
| CAPTCHA_SERVICE        | Select the captcha service you want to use on login (see list of available values below)                                                                                                                                                                                                              |
| CAPTCHA_SITE_KEY       | The site key from the selected captcha service                                                                                                                                                                                                                                                        |
| CAPTCHA_SECRET_KEY     | The secret key from the selected captcha service                                                                                                                                                                                                                                                      |
| SALT                   | 8 Characters defining salt for encryption (if not set encryption is disabled)                                                                                                                                                                                                                         |
| MAX_URL_LENGTH         | Maximum URL length that can be specified                                                                                                                                                                                                                                                              |
| HTTPS                  | True if using HTTPS, False otherwise                                                                                                                                                                                                                                                                  |
| HTTPS_PORT             | Port to listen on if using HTTPS                                                                                                                                                                                                                                                                      |
| ZIP_MAX_SIZE_MB        | The max size an album can be before it is allowed to be downloaded as a zip. set to '0' to disable. defaults to 100mb                                                                                                                                                                                 |
| IP_SALT                | The salt to add to the IP hash                                                                                                                                                                                                                                                                        |
| HOME_PAGE_FILE_COUNTER | This controls the file counter on the home page, the values can be `static`, `dynamic`, `off`. `static` means that the websocket is disabled and the file count will be static, `dynamic` means the file count will increase without reloading, and `off` means this is hidden. defaults to `dynamic` |
| DATABASE_TYPE          | This controls what database you want, select from `postgres` and `sqlite`, if you are using sqlite, you do not need to start `postgres` from the docker-compose and can be removed before starting it                                                                                                 |
| ALBUM_FILE_LIMIT       | This controls the number of files that can be associated with an album for normal buckets, if missing defaults to 256                                                                                                                                                                                 |

The available `CAPTCHA_SERVICE` values are:

* turnstile
* reCAPTCHA
* hCaptcha

> For rate limiting, if `RATE_LIMIT` was 1 and `RATE_LIMIT_MS` is `1000`. Then this means 1 request every second

> **HTTPS** Note well if running behind a reverse proxy (normal deployment) then HTTPS terminates at the proxy,
> and this should be set False

> **Google V2 Recaptcha**
> If you want to use google reCaptcha, then select the non-invisible one.

> **Note Well** if a path to an Antivirus engine is not defined it will not be used, if no paths are defined then no
> antivirus scanning will be used

### Build and Run commands

```batch
# add directories (once after cloning)
    mkdir files

# install dependencies
    npm install
    
# start redis, postgres and zipfiles (remove postgres if you intend on using sqlite)
    docker compose up -d
    
# build database
    npm run runmigration

# serve
    npm run start

# build for production
    npm run build
    npm run start:prod
```

## Buckets Admin Feature

Buckets are virtual collections of files that can be accessed with a token. When a bucket is created, the token is
provided.

> **Note Well** The bucket key provides full access to the files, including the ability to delete them, do not share the
> bucket key.
> It is intended to provide users the ability to manage their own files.

### Usage

To login to the bucket admin page, use the following URL, relative to the base URL:

```
/admin/bucket
```

Once the key is provided, the user will be taken to the file management page. This is very similar to the main file
management page of the admin feature, but restricted to the files contained in the bucket.

Buckets can be created from the login page by using the `Create Bucket` button. This will create and populate a bucket
token.

![CreateBucket](https://waifuvault.moe/f/1724958169898/CreateBucket.png)

### Bucket File Management Operations

On the navigation bar at the top, select **File Management** to get to the file management page.

Delete a file, by selecting it and pressing Delete File. You will be asked if you are sure.

![Delete](https://waifuvault.moe/f/1724959374292/BucketDeleteFile.png)

Download a file, by selecting it and pressing Download File.

![Download](https://waifuvault.moe/f/1724959382664/BucketDownloadFile.png)

Upload a file, by pressing Upload File, which will bring up the uploader where you can choose the file and set what
options you would like on it.

Select `Choose File` to upload a file, or `Choose URL` to upload from a URL.

> **NOTE:** The uploader will stay open after file upload, to allow you to easily upload multiple files

![Upload](https://waifuvault.moe/f/1724817237240/BucketUploadNew.png)

Details on a file, by selecting it and pressing Details. The longer fields have copy buttons on them in the details
panel.

![Details](https://waifuvault.moe/f/1724958342820/FileDetails.png)

Finally you can choose to delete the entire bucket. Be aware this will also delete all of the files in the bucket.
You do this by clicking on the red `Delete Bucket` button in the bottom right.

![DeleteBucket](https://waifuvault.moe/f/1724959398024/BucketDeleteBucket.png)

### Bucket Statistics

On the navigation bar at the top, select **Statistics** to get to the statistics page.

This page shows overall statistics for the files uploaded to the site:

* Total Number of Files Uploaded
* Total Size of Files Uploaded
* File Size Distribution of Files Uploaded
* Top 10 Media Types of Files Uploaded
* File Protection Level Distribution

![Stats](https://waifuvault.moe/f/1724107884794/BucketStats.png)

## Albums Admin Feature

Albums are sub-collections of files within a bucket. Albums can be publicly shared, to provide simple access to
a collection of files.

> **Note Well** One time download files cannot be included in albums.

### Creating Albums

To create an album, click on the `Create album` button in the main upper table.
Fill in the name you would like for the album and then click `Create Album` in the dialog.

A new tab for the album will then appear in the bottom Albums table.

![CreateAlbum](https://waifuvault.moe/f/1737302267058/CreateAlbum.png)

### Deleting Albums

To delete an album, in the bottom albums table, select the tab for the album you wish to delete. Then
in the bottom right, click on the `Delete Album` button.

A dialog will then come up asking you if you want to also delete the files in the album. If you choose
`Yes` then the files will be deleted from both the album and the bucket. If you choose `No` then the
files will be removed from the album, but not deleted from the bucket.

![DeleteAlbum](https://waifuvault.moe/f/1737302605135/DeleteAlbum.png)

### Sharing Albums

Albums can be publicly shared. This will provide you with a URL that can be used to view and download the
files within the album.

> **Note Well** One time download files cannot be included in albums, and files which are protected will
> still need the password to download.

To share an album, select the tab for the album in the bottom albums section, and then click on the `Share Album`
button in the bottom left.

This will add a new button with the public URL in the middle of the bottom bar. Clicking on this button
will copy the URL to the clipboard for you.

![ShareAlbum](https://waifuvault.moe/f/1737303000335/ShareAlbum.png)

To revoke sharing an album, select the tab for the album in the bottom albums section, and then click on
the `Unshare Album` button in the bottom left.

The green URL button will now disappear and the album will be private only again.

> **Note Well** If you unshare an album, the original album share URL is destroyed. If you share it again afterwards
> the URL will be different.

![UnshareAlbum](https://waifuvault.moe/f/1737303226165/UnshareAlbum.png)

### Public Album Interface

The public album access interface is available using the URL provided by sharing an album.

This provides the ability to view and download files within an album from a public URL. It also provides the
ability to download the files within an album as a zip file.

> **Note Well** The password will still be required for individual protected files within an album and
> they will not be included in the zip file download.

Two views are provided. The default view is the card view, which provides a thumbnail for those file
types that support it. Type icons will be shown for those that do not.

The card view can also be selected by clicking on the grid icon at the top right of the page.

Selecting individual files by using the checkboxes in the bottom left of the file card allows you to
select the files you want to download in the zip file.

If no files are selected then all files will be downloaded in the zip file.

![PublicCCards](https://waifuvault.moe/f/1737303700564/PublicCardsAlbum.png)

A table view of the files within the album is also available by clicking on the hamburger icon in the top
left of the page.

Selecting individual files by using the checkboxes next to the filename allows you to
select the files you want to download in the zip file.

If no files are selected then all files will be downloaded in the zip file.

![PublicTable](https://waifuvault.moe/f/1737304001712/PublicTableAlbum.png)

### Album File Management

To add files from the main bucket table to an album, select the files you want to add from the upper bucket table
and then click on `Add to Album`, and select the name of the album you wish to add the files to.

> **Note Well** Files can only be assigned to one album at a time. If you choose a file which is already assigned
> to another album, it will be moved to the chosen album.

![AddFilesToAlbum](https://waifuvault.moe/f/1737304346693/AddFilesAlbum.png)

To remove files from an album, click on the album tab in the lower table, select the file and then click
on the `Remove File` button.

The file will no longer be associated with the album.

![RemoveFilesFromAlbum](https://waifuvault.moe/f/1737304567646/RemoveFilesAlbum.png)

> **Note Well** For both add and remove, multiple files can be selected

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

![Deleting Files](https://waifuvault.moe/f/1724958559307/AdminDelete.png)

Download a file, by selecting it and pressing Download File.

![Downloading Files](https://waifuvault.moe/f/1724958603142/AdminDownload.png)

Details on a file, by selecting it and pressing Details. The longer fields have copy buttons on them in the details
panel.

Upload a file, by pressing Upload File, which will bring up the uploader where you can choose the file and set what
options you would like on it.

Select `Choose File` to upload a file, or `Choose URL` to upload from a URL.

> **NOTE:** The uploader will stay open after file upload, to allow you to easily upload multiple files

![Upload](https://waifuvault.moe/f/1724958492618/AdminFileUpload.png)

![File Details](https://waifuvault.moe/f/1724958342820/FileDetails.png)

### IP Operations

Ban an IP by selecting the file and pressing Ban IP, then confirming you want to ban it and if you want to delete
related files.

![Banning IP Address](https://waifuvault.moe/f/1724959406997/AdminBanIp.png)

Unban an IP by selecting the IP in the lower table and pressing Un Ban, then confirming you want to unban.

![Unban IP Address](https://waifuvault.moe/f/1724959412624/AdminUnbanIp.png)

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
