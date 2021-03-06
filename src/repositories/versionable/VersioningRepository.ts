import { Model, Query, DocumentQuery } from "mongoose";

import BaseRepository from "../BaseRepository";
import IVersionableDocument from "./IVersionableDocument";
import { generateObjectId } from "../../libs/utilities";

export default class VersioningRepository<
  D extends IVersionableDocument,
  M extends Model<D>
> extends BaseRepository<D, M> {
  constructor(modelType: M) {
    super(modelType);
  }

  public async create(options: any): Promise<D> {
    const id = generateObjectId();
    const data = {
      ...options,
      _id: id,
      originalId: id,
    };

    return super.create(data);
  }

  protected getAll(
    conditions: any,
    projection?: any | null,
    options?: any | null
  ): Promise<D[]> {
    const updatedQuery = {
      deletedAt: null,
      ...conditions,
    };

    return super.getAll(updatedQuery, projection, options);
  }

  public getById(id: string): DocumentQuery<D | null, D> {
    return super.findOne({ originalId: id, deletedAt: null }, {});
  }

  public getByQuery(conditions: any, projection: any = {}) {
    const updatedCondition = { ...conditions, deletedAt: null };
    return super.findOne(updatedCondition, projection);
  }

  public count(conditions: any): Query<number> {
    const updatedQuery = {
      deletedAt: null,
      ...conditions,
    };

    return super.count(updatedQuery);
  }

  public async update(options: any): Promise<D> {
    const previous = await this.getById(options.originalId);
    await this.invalidate(options.originalId);
    const newInstance = previous
      ? Object.assign(previous.toJSON(), options)
      : options;
    newInstance.id = generateObjectId();
    delete newInstance.createdAt;
    delete newInstance.deletedAt;
    delete newInstance._id;
    const model = new this.modelType(newInstance);

    return await model.save();
  }

  public invalidate(id: string): DocumentQuery<D, D> {
    return super.invalidate(id);
  }
}
