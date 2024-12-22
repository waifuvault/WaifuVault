import { CreateDateColumn, PrimaryGeneratedColumn, RelationOptions, UpdateDateColumn } from "typeorm";

export abstract class AbstractModel {
    protected static readonly cascadeOps: RelationOptions = {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    };

    @PrimaryGeneratedColumn("increment")
    public id: number;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;
}
