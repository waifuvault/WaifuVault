"use client";

import React, { useState } from "react";
import styles from "./AdvancedFeatures.module.scss";
import Dialog from "@/app/components/Dialog";
import Button from "@/app/components/Button";
import { useEnvironment } from "@/app/hooks/useEnvironment";

interface FeatureData {
    icon: string;
    title: string;
    description: string;
    modalContent: {
        title: string;
        content: React.ReactNode;
        hasButton?: boolean;
        buttonText?: string;
        buttonLink?: string;
    };
}

const advancedFeatures: FeatureData[] = [
    {
        icon: "bi-key",
        title: "Encrypted Files",
        description:
            "Upload files securely with AES-256 encryption using a password. Only those with the password can access the file.",
        modalContent: {
            title: "Encrypted Files",
            content: (
                <div>
                    <p>
                        Your files can be secured using industry-leading AES-256 encryption, for your security and
                        privacy. The password is not stored, and the file can only be decrypted by people you provide
                        the password to. Even we cannot decrypt the file should you lose the password.
                    </p>
                    <p>
                        When you upload a file with encryption enabled, you provide a password that is used to encrypt
                        the file before it&#39;s stored on our servers. Only people with both the file URL and the
                        correct password can access the file.
                    </p>
                    <p>Perfect for sensitive data, privacy concerns, and secure file sharing.</p>
                </div>
            ),
        },
    },
    {
        icon: "bi-binoculars",
        title: "Hide Filenames",
        description: "Share files anonymously with shortened URLs, Ideal for anonymous file sharing.",
        modalContent: {
            title: "Hide Filenames",
            content: (
                <div>
                    <p>The original filename of a file that is uploaded can be hidden at your choice.</p>
                    <p>
                        This allows you to use shortened, anonymous URLs to share files, without revealing potentially
                        sensitive details from the filename.
                    </p>
                    <p>A simple checkbox can be set on upload to do this.</p>
                </div>
            ),
        },
    },
    {
        icon: "bi-stopwatch",
        title: "Custom Retention Period",
        description: "Choose a custom expiry time for files, with options as short as one minute.",
        modalContent: {
            title: "Custom Retention Period",
            content: (
                <div>
                    <p>
                        You can choose how long your files are stored for. From as little as one minute, all the way up
                        to one year. You are in control of your datas lifespan.
                    </p>
                    <p>
                        You also have the ability to set a file to be removed once it has been downloaded - as a
                        one-time download link.
                    </p>
                    <p>
                        This feature allows you to confidently share files, knowing they will only exist long enough to
                        be transferred if you want or long enough to be useful if that&#39;s what you need.
                    </p>
                </div>
            ),
        },
    },
    {
        icon: "bi-bucket",
        title: "Buckets",
        description: "Create anonymous buckets to manage your files and track their stats with ease.",
        modalContent: {
            title: "Buckets",
            content: (
                <div>
                    <p>
                        Upload can be organized using our anonymous buckets feature. These are collections of files that
                        you have access to with a random unique key. No identifying information is used.
                    </p>
                    <p>With the key, you can access an administration interface that allows you to:</p>
                    <ul>
                        <li>View all your files</li>
                        <li>Delete files early</li>
                        <li>See download stats</li>
                        <li>Create albums</li>
                        <li>Bulk manage files</li>
                    </ul>
                    <p>Keep everything neatly sorted and managed without needing an account.</p>
                </div>
            ),
            hasButton: true,
            buttonText: "Create a bucket",
            buttonLink: "",
        },
    },
    {
        icon: "bi-shield-lock",
        title: "Secure Sharing",
        description: "Share files safely with end-to-end encryption.",
        modalContent: {
            title: "Secure Sharing",
            content: (
                <div>
                    <p>
                        Your files can be confidently shared knowing that they have end-to-end encryption, ensuring that
                        only the intended recipients can view your files.
                    </p>
                    <p>
                        File URLs are unique and not easily guessable, making sure only those you provide the URL to
                        will be able to access your files.
                    </p>
                    <p>
                        This is combined with our other file features of password protection and the ability to set one
                        time downloads, to provide a state of the art temporary file sharing system.
                    </p>
                </div>
            ),
        },
    },
    {
        icon: "bi-images",
        title: "Albums",
        description:
            "Organise and share collections of files seamlessly! Albums let you group files inside buckets and share them via a public URL, offering a read-only view for others.",
        modalContent: {
            title: "Albums Feature",
            content: (
                <div>
                    <p>
                        <strong>Albums</strong> are a powerful way to organise and share collections of files hosted in
                        your buckets.
                    </p>
                    <p>Key features of Albums:</p>
                    <ul>
                        <li>
                            <strong>Group Files:</strong> Organize related files together in a single album
                        </li>
                        <li>
                            <strong>Public Sharing:</strong> Generate a public URL for your album that anyone can access
                        </li>
                        <li>
                            <strong>Read-Only Access:</strong> Viewers can see and download files but cannot modify the
                            album
                        </li>
                        <li>
                            <strong>Easy Management:</strong> Add or remove files from albums through your bucket
                            interface
                        </li>
                        <li>
                            <strong>No Account Required:</strong> Albums work with our anonymous bucket system
                        </li>
                    </ul>
                    <p>
                        Perfect for sharing photo collections, project files, or any group of related documents while
                        maintaining organisation and privacy!
                    </p>
                </div>
            ),
            hasButton: true,
            buttonText: "Create a bucket",
            buttonLink: "",
        },
    },
];

export default function AdvancedFeatures() {
    const [selectedFeature, setSelectedFeature] = useState<FeatureData | null>(null);
    const { bucketAccessUrl } = useEnvironment();

    const handleFeatureClick = (feature: FeatureData) => {
        setSelectedFeature(feature);
    };

    const handleCloseModal = () => {
        setSelectedFeature(null);
    };

    return (
        <>
            <div className={styles.advancedFeatures}>
                <h2 className={styles.sectionTitle}>Features</h2>
                <div className={styles.alert}>
                    Explore our cool features! Secure, private, and easy-to-use file hosting.
                </div>
                <div className={styles.featureGrid}>
                    {advancedFeatures.map((feature, index) => (
                        <button
                            key={index}
                            className={styles.featureCardAdvanced}
                            onClick={() => handleFeatureClick(feature)}
                        >
                            <i className={feature.icon}></i>
                            <div className={styles.featureContent}>
                                <h5>{feature.title}</h5>
                                <p>{feature.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {selectedFeature && (
                <Dialog
                    isOpen={!!selectedFeature}
                    onClose={handleCloseModal}
                    title={selectedFeature.modalContent.title}
                    maxWidth="600px"
                >
                    <div className={styles.modalContent}>
                        {selectedFeature.modalContent.content}
                        {selectedFeature.modalContent.hasButton && (
                            <div className={styles.modalActions}>
                                <Button
                                    href={selectedFeature.modalContent.buttonLink || bucketAccessUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {selectedFeature.modalContent.buttonText}
                                </Button>
                            </div>
                        )}
                    </div>
                </Dialog>
            )}
        </>
    );
}
