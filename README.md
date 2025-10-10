## WaifuVault

WaifuVault is a temporary file hosting service, that allows for file uploads that are hosted for a set amount of time.

The amount of time a given file is hosted for is determined by its size. Files are hosted for a maximum of 365 days,
with the time being shortened on a cubic curve. This means for files up to about 50% of maximum file size will get
close to the maximum time. Beyond that, the time allotted drops off sharply, with the maximum size file getting 30 days
of hosting.

## Getting started

> **Important!** This requires Docker, Node >= 20 and TypeScript >= 5.5

## Migration Notice

> **⚠️ Breaking Change - Password Protected Files**
>
> Password protected file URLs have changed from `/f/` to `/p/`. If you have existing password-protected file links, you must replace `/f/` with `/p/` in the URL.
>
> **Before:** `https://waifuvault.moe/f/4c80f857-4147-4f6e-b77f-80b11aadd452/LMG.jpg`
> **After:** `https://waifuvault.moe/p/4c80f857-4147-4f6e-b77f-80b11aadd452/LMG.jpg`
>
> Non-password-protected files continue to use `/f/` as before.

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

| Setting                     | Description                                                                                                                                                                                                                                                                                           |
|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| BLOCKED_MIME_TYPES          | Comma seperated list of MIME types that will be blocked from being uploaded                                                                                                                                                                                                                           |
| CLAM_PATH                   | The path to your Clam Antivirus installation                                                                                                                                                                                                                                                          |
| MS_DEFENDER_PATH            | The path to your MS Defender Antivirus installation                                                                                                                                                                                                                                                   |
| UPLOAD_SECRET               | A secret passcode you can set, when used as on the upload as a query paramater `secret_token`, the file will have no expiry and will persist forever                                                                                                                                                  |
| RATE_LIMIT                  | If set, this will enable rate limiting, this defines how many requests can be made within the `RATE_LIMIT_MS` period                                                                                                                                                                                  |
| RATE_LIMIT_MS               | If `RATE_LIMIT` is set, then this is required and defines how long to wait for each rate limit reset                                                                                                                                                                                                  |
| CAPTCHA_SERVICE             | Select the captcha service you want to use on login (see list of available values below)                                                                                                                                                                                                              |
| CAPTCHA_SITE_KEY            | The site key from the selected captcha service                                                                                                                                                                                                                                                        |
| CAPTCHA_SECRET_KEY          | The secret key from the selected captcha service                                                                                                                                                                                                                                                      |
| SALT                        | 8 Characters defining salt for encryption (if not set encryption is disabled)                                                                                                                                                                                                                         |
| MAX_URL_LENGTH              | Maximum URL length that can be specified                                                                                                                                                                                                                                                              |
| HTTPS                       | True if using HTTPS, False otherwise                                                                                                                                                                                                                                                                  |
| HTTPS_PORT                  | Port to listen on if using HTTPS                                                                                                                                                                                                                                                                      |
| ZIP_MAX_SIZE_MB             | The max size an album can be before it is allowed to be downloaded as a zip. set to '0' to disable. defaults to 100mb                                                                                                                                                                                 |
| IP_SALT                     | The salt to add to the IP hash                                                                                                                                                                                                                                                                        |
| HOME_PAGE_FILE_COUNTER      | This controls the file counter on the home page, the values can be `static`, `dynamic`, `off`. `static` means that the websocket is disabled and the file count will be static, `dynamic` means the file count will increase without reloading, and `off` means this is hidden. defaults to `dynamic` |
| DATABASE_TYPE               | This controls what database you want, select from `postgres` and `sqlite`, if you are using sqlite, you do not need to start `postgres` from the docker-compose and can be removed before starting it                                                                                                 |
| ALBUM_FILE_LIMIT            | This controls the number of files that can be associated with an album for normal buckets, if missing defaults to 256                                                                                                                                                                                 |
| TRUSTED_UPLOADER_IPS        | A comma seperated list of ips that are trusted to extra the ip from a custom `x-real-ip` header                                                                                                                                                                                                       |
| VIRUSTOTAL_KEY              | The API Key to use for calls to virustotal                                                                                                                                                                                                                                                            |
| VIRUSTOTAL_REPUTATION_LIMIT | This is a value from 0 (requires almost no malicious reports) to 9 (will pass with 90% malicious reports) to decide if the file should be deleted                                                                                                                                                     |
| DANGEROUS_MIME_TYPES        | A comma seperated list of mime types that will be subjected to file reputation check                                                                                                                                                                                                                  |
| FILE_REPUTATION_CRON        | This allows you to set a custom cron schedule to check recent uploads                                                                                                                                                                                                                                 |
| FRONT_END_URL               | The URL for the Next.js frontend application. Used for protected file URLs and authentication redirects                                                                                                                                                                                                |
| COOKIE_DOMAIN               | The domain to use for session cookies. Should match your deployment domain                                                                                                                                                                                                                            | 

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

#### File Reputation Check

In addition to blocking certain file types, you can allow a given set of file types, but subject those file to a reputation check using VirusTotal.
Newly uploaded files will be checked using their hash by a background service.  If they exceed a set threshold (settable int he env file), they will be deleted.
For this you will need a virustotal API key and to set the following in the .env file.

> If the VIRUSTOTAL_KEY is not set, this system will not be used

| Setting                     | Description                                                                                                                                       |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| VIRUSTOTAL_KEY              | The API Key to use for calls to virustotal                                                                                                        |
| VIRUSTOTAL_REPUTATION_LIMIT | This is a value from 0 (requires almost no malicious reports) to 9 (will pass with 90% malicious reports) to decide if the file should be deleted |
| DANGEROUS_MIME_TYPES        | A comma seperated list of mime types that will be subjected to file reputation check                                                              |
| FILE_REPUTATION_CRON        | This allows you to set a custom cron schedule to check recent uploads                                                                             |

### Frontend Setup

The Next.js frontend is located in the `frontend/waifu-vault` directory and requires its own `.env` file for configuration.

Create a `.env` file in `frontend/waifu-vault/` with the following settings:

```env
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:8280
NEXT_PUBLIC_WAIFUVAULT_BACKEND=http://127.0.0.1:8081
NEXT_PUBLIC_HOME_PAGE_FILE_COUNTER=dynamic
NODE_ENV=development
NEXT_PUBLIC_UPLOADER_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_DEV_ORIGINS=127.0.0.1
NEXT_PUBLIC_THUMBNAIL_SERVICE=http://127.0.0.1:5006
```

Frontend Environment Variables:

| Setting                             | Description                                                                                   |
|-------------------------------------|-----------------------------------------------------------------------------------------------|
| NEXT_PUBLIC_BASE_URL                | The URL where the Next.js frontend is hosted                                                  |
| NEXT_PUBLIC_WAIFUVAULT_BACKEND      | The URL where the backend API is hosted                                                       |
| NEXT_PUBLIC_HOME_PAGE_FILE_COUNTER  | Controls the file counter display (static, dynamic, or off)                                   |
| NODE_ENV                            | The Node environment (development or production)                                              |
| NEXT_PUBLIC_UPLOADER_URL            | The URL for the uploader service                                                              |
| NEXT_PUBLIC_ALLOWED_DEV_ORIGINS     | Comma-separated list of allowed origins for development                                       |
| NEXT_PUBLIC_THUMBNAIL_SERVICE       | The URL for the thumbnail generation service                                                  |

> **Note:** For production deployments, adjust these URLs to match your production environment.

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

![CreateBucket](https://waifuvault.moe/f/5264a78d-7147-418b-84cb-2632f587e239/CreateBucket.png)

### Bucket File Management Operations
The column on the left allows you to manage albums, which are collections of files.  The `All Files` shows all files in 
the bucket, which will include all of the files in your albums.  Files can be moved into albums by drag and drop.
To create an album you can click on `Create First` or use the `+` at the top.

If you right click on an album, you will get a context menu that allows you to share or unshare the album, pin or 
unpin it from the list and delete it.

![Albums](https://waifuvault.moe/f/c389c62e-8fe8-4757-8e81-b0f5aec5b728/AlbumColumn.png)

Delete a file, by selecting it and pressing Delete. You will be asked if you are sure.

![Delete](https://waifuvault.moe/f/f9748592-45fa-4333-82a7-c178db6dbb7b/DeleteFile.png)

Download a file, by selecting it and clicking `View`.

![Download](https://waifuvault.moe/f/c1061c24-dc7a-4c87-9863-2b6f502e8f55/DownloadFile.png)

Upload a file, by clicking `Upload`, which will bring up the uploader where you can choose the file and set what
options you would like on it.

Drag files to the central box, which will put them in the upload queue.  Once in the upload queue, you can set options 
such as password, expiry time, hidden filename and one time access by clicking on the `gear` icon next to the file.
You can also delete it from the queue by using the `trash` icon.

Once you have your files and options set in the queue, click on `Upload Files` to upload them.

> NOTE: The uploader will stay open after upload, top allow easy multiple upload.  Simply close the 
> modal when you are done.

![Upload](https://waifuvault.moe/f/252bd2a5-a288-4ced-8395-d78e2f96098e/UploadFile.png)

If you have an album selected, then the upload button will show as `Upload Files to Album`.  This will bring up the uploader
and at the top it will show you how many files are in the album and how many more you have before the album is full.
Now selecting files will upload them directly to the album.

![UploadAlbumFile](https://waifuvault.moe/f/e8f52ef5-c952-46f6-95f5-93989be2ff23/UploadAlbumFile.png)

There are a number of views you can choose for files.  `Grid` is the default, and shows the information and a preview of the
file as a card.  `List` shows a simple list of the filenames with a clickable view icon, and `Table` shows a table version,
with the filename, some file attributes and a clickable view icon.

![FileViews](https://waifuvault.moe/f/17268662-c849-435b-b796-edd0f8b2656e/FileViews.png)

Directly below the view column, are the sort and pagination options.  Files can be sorted by `Name`, `Date`, `Size` and 
`Type`.  If you are in an album then there is also another sort option - `Layout`.  This is how the files will show on 
the public album page if you share it, and using drag and drop you can rearrange the files as you see fit.

Pagination sizes can be set to 10, 50 or 100.  Sort and size will be remembered for each album individually.

![SortOptions](https://waifuvault.moe/f/f08ee717-1f43-4779-9213-01d84108cd94/SortOptions.png)

## Albums Admin Feature

Albums are sub-collections of files within a bucket. Albums can be publicly shared, to provide simple access to
a collection of files.

> **Note Well** One time download files cannot be included in albums.

### Creating Albums

To create an album, click on the `+` button in the upper right of the albums column.
Fill in the name you would like for the album and then click `Create Album` in the dialog.

A new entry for the album will appear in the list.

![CreateAlbum](https://waifuvault.moe/f/eba48458-febe-4220-8879-17d3cfc9d6b6/CreateAlbum.png)

### Deleting Albums

To delete an album, in the albums column, right click on the album and choose `Delete Album`

A dialog will then come up asking you if you want to also delete the files in the album. If you choose
`Delete album and all files` then the files will be deleted from both the album and the bucket. If you choose `Delete album, keep files` then the
files will be removed from the album, but not deleted from the bucket.

![DeleteAlbum](https://waifuvault.moe/f/3241e39d-bd29-4ccc-9d06-d87546f04165/DeleteAlbum.png)

### Sharing Albums

Albums can be publicly shared. This will provide you with a URL that can be used to view and download the
files within the album.

> **Note Well** One time download files cannot be included in albums, and files which are protected will
> still need the password to download.

To share an album, right click on the album and choose `Share Album`.

Now when you right click again on the album, there will be an option `Copy public URL`, which will
copy the public URL for the album.

![ShareAlbum](https://waifuvault.moe/f/76200299-ec2b-4448-9327-093124b4cd90/ShareAlbum.png)

To revoke sharing an album, right click on the album and choose `Unshare Album`.

The `Copy public URL` option will now disappear and the album will be private only again.

> **Note Well** If you unshare an album, the original album share URL is destroyed. If you share it again afterwards
> the URL will be different.

![UnshareAlbum](https://waifuvault.moe/f/56c382b1-cd28-4c8b-adc7-20354ab020ee/UnshareAlbum.png)

### Public Album Interface

The public album access interface is available using the URL provided by sharing an album.

This provides the ability to view and download files within an album from a public URL. It also provides the
ability to download the files within an album as a zip file.

> **Note Well** The password will still be required for individual protected files within an album and
> they will not be included in the zip file download.

The same three views from the admin are provided - `Grid`, `List` and `Table`.

Selecting individual files by using the checkboxes in the upper right of the file card allows you to
select the files you want to download in the zip file.

If no files are selected then all files will be downloaded in the zip file.

![PublicCCards](https://waifuvault.moe/f/c8c0fdab-cfe8-492d-b22c-c6fd0ae915cc/PublicAlbum.png)

Selecting individual files by using the checkboxes next to the filename allows you to
select the files you want to download in the zip file.

Buttons allowing you to download the selected files or all of the files are available in the top right.

![PublicDownload](https://waifuvault.moe/f/ce2fb123-85ca-47f4-8678-d0bd149e406f/PublicDownload.png)

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

The file management page will show up, and it is very similar to the bucket management page.
There is no album column, as those are related to buckets.

Delete a file, by selecting it and pressing Delete File. You will be asked if you are sure.

![Deleting Files](https://waifuvault.moe/f/e32f1d8b-f7a7-4e38-bfc3-506ed21c7025/AdminDeleteFile.png)

Download a file, by selecting it and pressing View.

![Downloading Files](https://waifuvault.moe/f/af5a860b-8153-44d7-80a6-aa554ab913bb/AdminDownload.png)

Upload a file, by clicking `Upload`, which will bring up the uploader where you can choose the file and set what
options you would like on it.

Drag files to the central box, which will put them in the upload queue.  Once in the upload queue, you can set options
such as password, expiry time, hidden filename and one time access by clicking on the `gear` icon next to the file.
You can also delete it from the queue by using the `trash` icon.

Once you have your files and options set in the queue, click on `Upload Files` to upload them.

> **NOTE:** The uploader will stay open after file upload, to allow you to easily upload multiple files

![Upload](https://waifuvault.moe/f/3de0be4b-8a7a-4e51-8bc1-ccadc16e4977/AdminUpload.png)

### IP Operations

Ban an IP by selecting the file and right click, choosing `Ban IP`, then confirming you want to ban it and if you want to delete
related files.

Unban an IP by selecting the IP in the lower table and clicking Unblock Selected, then confirming you want to unblock.

![Banning IP Address](https://waifuvault.moe/f/c5b0aa32-20df-4170-a2d9-f09471dbe3ea/AdminBanIP.png)

## REST Endpoints

All application functionality is provided by a set of REST endpoints.

| Endpoint             | Description                                                                              |
|----------------------|------------------------------------------------------------------------------------------|
| PUT /rest            | Upload file using either a provided file in form data or a provided URL hosting the file |
| GET /rest/{token}    | Return file information, including URL and time left to live                             |
| DELETE /rest/{token} | Delete file referred to by token                                                         |

## Site URL

> https://waifuvault.moe
