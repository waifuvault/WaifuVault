import { dataSource } from "./DataSource.js";

await dataSource.initialize();

dataSource
    .runMigrations()
    .then(() => {
        console.log("Migrations ran successfully");
        process.exit(0);
    })
    .catch(error => {
        console.error("Error running migrations", error);
        process.exit(1);
    });
