"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./SDKExamples.module.scss";
import Button from "@/app/components/Button/Button";
import { useEnvironment } from "@/app/hooks/useEnvironment";
import { useTheme } from "@/app/contexts/ThemeContext";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import go from "highlight.js/lib/languages/go";
import csharp from "highlight.js/lib/languages/csharp";
import rust from "highlight.js/lib/languages/rust";
import java from "highlight.js/lib/languages/java";
import php from "highlight.js/lib/languages/php";
import bash from "highlight.js/lib/languages/bash";
import elixir from "highlight.js/lib/languages/elixir";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("go", go);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("java", java);
hljs.registerLanguage("php", php);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("elixir", elixir);

interface SDKExample {
    id: string;
    name: string;
    description?: string;
    sdkUrl?: string;
    sdkText?: string;
    code: string;
    language: string;
    isOutdated?: boolean;
}

export default function SDKExamples() {
    const [selectedSDK, setSelectedSDK] = useState<string>("curl");
    const { apiDocsUrl, waifuVaultBackend } = useEnvironment();
    const { isLightTheme } = useTheme();
    const codeRef = useRef<HTMLElement>(null);

    const sdkExamples: SDKExample[] = [
        {
            id: "curl",
            name: "Curl",
            language: "bash",
            code: `// upload file via URL
curl --request PUT --url ${waifuVaultBackend}/rest --data url=https://victorique.moe/img/slider/Quotes.jpg

// upload file via File
curl --request PUT --url ${waifuVaultBackend}/rest --header 'Content-Type: multipart/form-data' --form file=@someFile.png`,
        },
        {
            id: "node",
            name: "Node.js",
            description: "For Node, there is an official SDK that provides access to all of the features of the site.",
            sdkUrl: "https://www.npmjs.com/package/waifuvault-node-api",
            sdkText: "WaifuVault Node API",
            language: "typescript",
            code: `import Waifuvault from "waifuvault-node-api";

// upload file
const resp = await Waifuvault.uploadFile({
    file: "./files/aCoolFile.jpg"
});
console.log(resp.url); // the file download URL

// upload via URL
const resp = await Waifuvault.uploadFile({
    url: "https://waifuvault.moe/assets/custom/images/vic_vault.webp"
});
console.log(resp.url); // the file download URL

// upload a buffer
const resp = await Waifuvault.uploadFile({
    file: Buffer.from("someData"),
    filename: "aCoolFile.jpg"
});
console.log(resp.url); // the file download URL`,
        },
        {
            id: "python",
            name: "Python",
            description:
                "For Python, there is an official SDK that provides access to all of the features of the site.",
            sdkUrl: "https://pypi.org/project/waifuvault/",
            sdkText: "WaifuVault Python API",
            language: "python",
            code: `import waifuvault
import io

# upload file
upload_file = waifuvault.FileUpload("./files/aCoolFile.png")
upload_res = waifuvault.upload_file(upload_file)
print(upload_res.url)

# upload via URL
upload_file = waifuvault.FileUpload("https://waifuvault.moe/assets/custom/images/vic_vault.webp")
upload_res = waifuvault.upload_file(upload_file)
print(upload_res.url)

# upload a buffer
with open("./files/aCoolFile.png", "rb") as fh:
    buf = io.BytesIO(fh.read())

upload_file = waifuvault.FileUpload(buf, "aCoolFile.png")
upload_res = waifuvault.upload_file(upload_file)
print(upload_res.url)`,
        },
        {
            id: "go",
            name: "Go",
            description: "For Go, there is an official SDK that provides access to all of the features of the site.",
            sdkUrl: "https://pkg.go.dev/github.com/waifuvault/waifuVault-go-api",
            sdkText: "WaifuVault Go API",
            language: "go",
            code: `//upload via URL
package main

import (
	"context"
	"fmt"
	"github.com/waifuvault/waifuVault-go-api/pkg"
	waifuMod "github.com/waifuvault/waifuVault-go-api/pkg/mod" // namespace mod
	"net/http"
)

func main() {
	api := waifuVault.NewWaifuvaltApi(http.Client{})
	file, err := api.UploadFile(context.TODO(), waifuMod.WaifuvaultPutOpts{
		Url: "https://waifuvault.moe/assets/custom/images/vic_vault.webp",
	})
	if err != nil {
		return
	}
	fmt.Printf(file.URL) // the URL
}

// upload file
package main

import (
	"context"
	"fmt"
	"github.com/waifuvault/waifuVault-go-api/pkg"
	waifuMod "github.com/waifuvault/waifuVault-go-api/pkg/mod"
	"net/http"
	"os"
)

func main() {
	api := waifuVault.NewWaifuvaltApi(http.Client{})

	fileStruc, err := os.Open("myCoolFile.jpg")
	if err != nil {
		fmt.Print(err)
	}

	file, err := api.UploadFile(context.TODO(), waifuMod.WaifuvaultPutOpts{
		File: fileStruc,
	})
	if err != nil {
		return
	}
	fmt.Printf(file.URL) // the URL
}`,
        },
        {
            id: "csharp",
            name: "C#",
            description: "For C#, there is an official SDK that provides access to all of the features of the site.",
            sdkUrl: "https://www.nuget.org/packages/Waifuvault",
            sdkText: "WaifuVault C# API",
            language: "csharp",
            code: `using Waifuvault;
using System.IO;

// Upload file
var uploadFile = new Waifuvault.FileUpload("./aCoolFile.png");
var uploadResp = await Waifuvault.Api.uploadFile(uploadFile);
Console.WriteLine(uploadResp.url);

// Upload via URL
var uploadFile = new Waifuvault.FileUpload("https://waifuvault.moe/assets/custom/images/vic_vault.webp");
var uploadResp = await Waifuvault.Api.uploadFile(uploadFile);
Console.WriteLine(uploadResp.url);

// Upload via Buffer
byte[] buffer = File.ReadAllBytes("./aCoolFile.png");
var uploadFile = new Waifuvault.FileUpload(buffer,"aCoolFile.png");
var uploadResp = await Waifuvault.Api.uploadFile(uploadFile);
Console.WriteLine(uploadResp.url);`,
        },
        {
            id: "rust",
            name: "Rust",
            description: "For Rust, there is an official SDK that provides access to all of the features of the site.",
            sdkUrl: "https://crates.io/crates/waifuvault",
            sdkText: "WaifuVault Rust API",
            language: "rust",
            code: `use waifuvault::{
    ApiCaller,
    api::{WaifuUploadRequest, WaifuResponse}
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let caller = ApiCaller::new();

    // Upload a file from disk
    let request = WaifuUploadRequest::new()
        .file("/some/file/path") // Path to a file
        .password("set a password") // Set a password
        .one_time_download(true); // Delete after first access
    let response = caller.upload_file(request).await?;

    // Upload a file from a URL
    let request = WaifuUploadRequest::new()
        .url("https://some-website/image.jpg"); // URL to content
    let response = caller.upload_file(request).await?;

    // Upload a file from raw bytes
    let data = std::fs::read("some/file/path")?;
    let request = WaifuUploadRequest::new()
        .bytes(data, "name-to-store.rs"); // Raw file content and name to store on the vault
    let response = caller.upload_file(request).await?;

    Ok(())
}`,
        },
        {
            id: "java",
            name: "Java",
            language: "java",
            code: `// using Apache HttpClient

import org.apache.http.client.ResponseHandler;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;

import java.io.IOException;
import java.nio.file.Path;

public class Example {

  private static void uploadFile(final Path file) throws IOException {
    try (final var httpclient = HttpClients.createDefault()) {
      final var data = MultipartEntityBuilder.create().setMode(HttpMultipartMode.BROWSER_COMPATIBLE)
          .addBinaryBody("file", file.toFile())
          .build();
      final var request = RequestBuilder.put("${waifuVaultBackend}/rest").setEntity(data).build();
      final ResponseHandler<String> responseHandler = response -> response.getEntity() != null ? EntityUtils.toString(response.getEntity()) : null;
      final var responseBody = httpclient.execute(request, responseHandler);
      System.out.println(responseBody);
    }
  }

  private static void uploadUrl(final String url) throws IOException {
    try (final var httpclient = HttpClients.createDefault()) {
      final var data = MultipartEntityBuilder.create().setMode(HttpMultipartMode.BROWSER_COMPATIBLE)
          .addTextBody("url", url)
          .build();
      final var request = RequestBuilder.put("${waifuVaultBackend}/rest").setEntity(data).build();
      final ResponseHandler<String> responseHandler = response -> response.getEntity() != null ? EntityUtils.toString(response.getEntity()) : null;
      final var responseBody = httpclient.execute(request, responseHandler);
      System.out.println(responseBody);
    }
  }
}`,
        },
        {
            id: "php",
            name: "PHP",
            description: "For PHP, there is an outdated SDK that provides access to managing files only.",
            sdkUrl: "https://packagist.org/packages/ernestmarcinko/waifuvault-php-api",
            sdkText: "WaifuVault PHP API",
            language: "php",
            isOutdated: true,
            code: `// Upload file
use ErnestMarcinko\\WaifuVault\\WaifuApi;

$waifu = new WaifuApi();
$response = $waifu->uploadFile(array(
	'file' =>   __DIR__ . '/image.jpg',
));
var_dump($response);

// Upload via URL
use ErnestMarcinko\\WaifuVault\\WaifuApi;

$waifu = new WaifuApi();
$response = $waifu->uploadFile(array(
	'url' =>   'https://waifuvault.moe/assets/custom/images/vic_vault.webp',
));
var_dump($response);

// Upload via Buffer
use ErnestMarcinko\\WaifuVault\\WaifuApi;

$waifu = new WaifuApi();
$response = $waifu->uploadFile(array(
	'file_contents' => file_get_contents(__DIR__ . '/image.jpg'),
	'filename' => 'image.jpg',
));
var_dump($response);`,
        },
        {
            id: "elixir",
            name: "Elixir",
            description:
                "For Elixir, there is an official SDK that provides access to all of the features of the site.",
            sdkUrl: "https://hexdocs.pm/waifu_vault/api-reference.html",
            sdkText: "WaifuVault Elixir API",
            language: "elixir",
            code: `require WaifuVault

# Upload file from disk
  options = %{}
  {:ok, fileResponse} = WaifuVault.upload_local_file("./mix.exs", "my_mix.exs", options)
  {:ok, %{...}}

# Upload file from URL
  options = %{}
  {:ok, fileResponse} = WaifuVault.upload_via_url(image_url, options)
  {:ok, %{...}}

# Upload file from buffer
  {:ok, buffer} = File.read("some/local/file")
  {:ok, fileResponse} = WaifuVault.upload_file_from_buffer(buffer, "file.name", %{expires: "10m"})
  {:ok, %{...}}`,
        },
    ];

    const selectedExample = sdkExamples.find(sdk => sdk.id === selectedSDK) || sdkExamples[0];

    useEffect(() => {
        const themeToLoad = isLightTheme() ? "github" : "atom-one-dark";

        const existingLink = document.getElementById("hljs-theme");
        if (existingLink) {
            existingLink.remove();
        }
        const link = document.createElement("link");
        link.id = "hljs-theme";
        link.rel = "stylesheet";
        link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${themeToLoad}.min.css`;
        document.head.appendChild(link);
    }, [isLightTheme]);

    useEffect(() => {
        if (codeRef.current) {
            codeRef.current.removeAttribute("data-highlighted");
            codeRef.current.className = codeRef.current.className.replace(/hljs[a-z\-]*/g, "");
            hljs.highlightElement(codeRef.current);
        }
    }, [selectedSDK, isLightTheme]);

    return (
        <div className={styles.sdkExamples}>
            <div className={styles.examplesWrapper}>
                <h2 className={styles.title}>Examples</h2>
                <p className={styles.subtitle}>
                    Please refer to the{" "}
                    <a href={apiDocsUrl} target="_blank" rel="noopener noreferrer" className={styles.swaggerLink}>
                        Swagger
                    </a>{" "}
                    for full API documentation including endpoints and optional arguments you can pass.
                </p>

                <div className={styles.sdkSelector}>
                    {sdkExamples.map(sdk => (
                        <button
                            key={sdk.id}
                            className={`${styles.sdkButton} ${selectedSDK === sdk.id ? styles.active : ""}`}
                            onClick={() => setSelectedSDK(sdk.id)}
                        >
                            {sdk.name}
                        </button>
                    ))}
                </div>

                <div className={styles.exampleContent}>
                    {selectedExample.description && (
                        <div className={styles.description}>
                            <p>{selectedExample.description}</p>
                            {selectedExample.sdkUrl && (
                                <Button
                                    href={selectedExample.sdkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="small"
                                >
                                    {selectedExample.sdkText}
                                </Button>
                            )}
                            {selectedExample.isOutdated && (
                                <div className={styles.outdatedWarning}>
                                    <strong>Note:</strong> This SDK is not actively maintained
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.codeBlock}>
                        <pre>
                            <code ref={codeRef} className={`language-${selectedExample.language}`}>
                                {selectedExample.code}
                            </code>
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
