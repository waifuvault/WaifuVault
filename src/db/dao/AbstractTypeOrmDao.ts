import type { DataSource, EntityManager, EntityTarget, Repository as Dao } from "typeorm";
import type { ObjectLiteral } from "typeorm/common/ObjectLiteral";

export abstract class AbstractTypeOrmDao<T extends ObjectLiteral> {
    private readonly dao: Dao<T>;

    protected constructor(
        protected readonly ds: DataSource,
        model: EntityTarget<T>,
    ) {
        this.dao = ds.getRepository(model);
    }

    public get dataSource(): DataSource {
        return this.ds;
    }

    protected getRepository(transaction?: EntityManager): Dao<T> {
        return transaction ? transaction.getRepository(this.dao.target) : this.dao;
    }
}
