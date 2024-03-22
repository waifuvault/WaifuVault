module.exports = [
    {
        script: "./dist/index.js",
        name: "waifu_vault",
        time: true,
        source_map_support: true,
        watch: false,
        autorestart: true,
        error_file: "./logs/err.log",
        out_file: "./logs/out.log",
        log_file: "./logs/combined.log",
        instances : "max",
        exec_mode : "cluster",
        env: {
            NODE_ENV: "production",
        },
    },
];
