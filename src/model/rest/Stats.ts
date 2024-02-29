import {Property} from "@tsed/schema";
import {Builder} from "builder-pattern";
import {FileDao} from "../../db/dao/FileDao.js";
import type {ChartData} from "../../utils/typeings.js";
import {dataSource} from "../../db/DataSource.js";

export class Stats {

    @Property()
    public totalFileCount: number;

    @Property()
    public totalFileSize: number;

    @Property()
    public protectionLevels: ChartData[];

    @Property()
    public fileSizes: ChartData[];

    @Property()
    public topMimeTypes: ChartData[];

    @Property()
    public uploadVelocity: ChartData[];

    public static async buildStats(): Promise<Stats> {
        const fileDao = new FileDao(dataSource);
        const totalFileCount = await fileDao.getRawSQL('SELECT COUNT(*) FROM file_upload_model') as string;
        const totalFileSize = await fileDao.getRawSQL('SELECT SUM(fileSize) FROM file_upload_model') as string;
        const protectionLevels = await fileDao.getRawSQL('select case when encrypted=1 then \'Encrypted\' else \'None\' end as category, count(*) as value from file_upload_model group by category') as ChartData[];
        const topMediaTypes = await fileDao.getRawSQL('select mediaType as category, count(*) as value from file_upload_model group by mediaType order by value desc limit 10') as ChartData[];
        const uploadVelocity = await fileDao.getRawSQL('select date(createdAt) as category, count(*) as value from file_upload_model where createdAt >= datetime(\'now\', \'-30 days\') group by date(createdAt) order by date(createdAt) asc') as ChartData[];
        const statsBuilder = Builder(Stats)
            .totalFileCount(parseInt(totalFileCount))
            .totalFileSize(parseInt(totalFileSize))
            .protectionLevels(protectionLevels)
            .topMimeTypes(topMediaTypes)
            .uploadVelocity(uploadVelocity);
        return statsBuilder.build();
    }
}