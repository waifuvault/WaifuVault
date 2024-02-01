## hostMyShit
hostMyShit is a temporary file hosting service, that allows for file uploads that are hosted for a set amount of time.  

The amount of time a given file is hosted for is determined by its size.  Files are hosted for a maximum of 365 days, 
with the time being shortened on a cubic curve.  This means for files up to about 50% of maximum file size will get 
close to the maximum time.  Beyond that, the time allotted drops off sharply, with the maximum size file getting about 
5 minutes of hosting.

> **Important!** this is currently in BETA and features such as a homepages and admin pages will be added in the near future

## Getting started

> **Important!** this requires Node >= 14, Express >= 4 and TypeScript >= 4.

`.env` file must be created for this application to work. rename `.envExample` to `.env`

### Env file settings
Required Settings

| Setting                   | Description                                                                 |
|---------------------------|-----------------------------------------------------------------------------|
| FILE_SIZE_UPLOAD_LIMIT_MB | Limit on size of file allowed to be uploaded                                |
| BLOCKED_MIME_TYPES        | Comma seperated list of MIME types that will be blocked from being uploaded |

> **Note Well** the file size sets the time to live for a file, so files close to the upload limit will only be hosted for about 5 minutes.  It is a cubic curve so files up to 50% of the size will get close to a year of hosting time.

Optional Settings

| Setting   | Description                                                                                  |
|-----------|----------------------------------------------------------------------------------------------|
| CLAM_PATH | The path to your Clam Antivirus installation - necessary to enable virus scanning of uploads |

### Build and Run commands

> **Empty Directories**! The application is currently in BETA with no views, so you will need to add the empty directories first


```batch
# add directories (once after cloning)
    mkdir src/controllers/secureViews
    mkdir src/controllers/views
    mkdir files

# install dependencies
    npm install

# serve
    npm run start

# build for production
    npm run build
    npm run start:prod
```

## REST Endpoints
All application functionality is provided by a set of REST endpoints.

| Endpoint             | Description                                                                              |
|----------------------|------------------------------------------------------------------------------------------|
| PUT /rest            | Upload file using either a provided file in form data or a provided URL hosting the file |
| GET /rest/{token}    | Return file information, including URL and time left to live                             |
| DELETE /rest/{token} | Delete file referred to by token                                                         |

## Site URL

The following URL is a temporary location whilst BETA testing:

> https://hostmyshit.victorique.moe