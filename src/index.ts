import * as Mongoose from 'mongoose';

interface PluginOptions {
  collection?: string,
  logError?: boolean,
  mongoose?: typeof Mongoose,
  ignoreMissingHooks?: boolean
}

const VERSION: string = "_version";
const ID: string = "_id";

export = function (schema: Mongoose.Schema, options: PluginOptions) {
  if (typeof(options) == 'string') {
    options = {
      collection: options
    }
  }

  options = options || {};
  options.collection = options.collection || 'versions';
  options.logError = options.logError || false;
  options.mongoose = options.mongoose || require('mongoose');
  options.ignoreMissingHooks = options.ignoreMissingHooks || false;

  // Make sure there's no _version path
  if (schema.path(VERSION)) {
    throw Error("Schema can't have a path called \"_version\"");
  }

  let vermongoSchema = cloneSchema(schema, options.mongoose);
  let mongoose = options.mongoose;

  // Copy schema options
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      vermongoSchema.set(key, options[key]);
    }
  }

  // Add Custom fields
  schema.add({
    _version: { type: Number, required: true, default: 0, select: true }
  });
  vermongoSchema.add({
    _id: mongoose.Schema.Types.Mixed,
    _version: { type: Number, required: true, default: 0, select: true }
  });

  // Turn off internal versioning, we don't need this since we version on everything
  schema.set("versionKey", false);
  vermongoSchema.set("versionKey", false);


  // Add reference to model to original schema
  schema.statics.VersionedModel = mongoose.model(options.collection, vermongoSchema);

  schema.pre('save', function(next) {
    if (this.isNew) {
      // console.log('[new]');
      this[VERSION] = 1;
      return next();
    }
    let baseVersion = this[VERSION];

    // load the base version
    let base;
    this.collection
      .findOne({ [ID]: this[ID] })
      .then((foundBase) => {
        if (foundBase === null) {
          let err = new Error('document to update not found in collection');
          throw(err);
        }

        base = foundBase;
        let bV = base[VERSION];

        if (baseVersion !== bV) {
          let err = new Error('modified and base versions do not match');
          throw(err);
        }

        let clone = base;

        // Build Vermongo historical ID
        clone[ID] = { [ID]: this[ID], [VERSION]: this[VERSION] };

        // Increment version number
        this[VERSION] = this[VERSION] + 1;

        return new schema.statics.VersionedModel(clone)
          .save();
      })
      .then(() => {
          // console.log('[saved]');
          next();
          return null;
      })
      .catch((err) => {
          if (options.logError) {
            console.log(err);
          }
          next(err);
          return null;
      })
  });

  schema.pre('remove', function(next) {
    var clone = this.toObject();
    clone[ID] = { [ID]: this[ID], [VERSION]: this[VERSION]};

    new schema.statics.VersionedModel(clone)
      .save()
      .then(() => {
        this[VERSION]++;
        let deletedClone = {
          [ID]: { [ID]: this[ID], [VERSION]: this[VERSION] },
          [VERSION]: -1
        }
        return new schema.statics.VersionedModel(deletedClone)
          .save();
      })
      .then(() => {
        // console.log('[removed]');
        next();
        return null;
      })
      .catch((err) => {
        if (options.logError) {
          console.log(err);
        }
        next(err);
        return null;
      });
  });

  // TODO
  schema.pre('update', function(next) { if(options.ignoreMissingHooks) {next();} });
  schema.pre('findOneAndUpdate', function(next) { if(options.ignoreMissingHooks) {next();} });
  schema.pre('findOneAndRemove', function(next) { if(options.ignoreMissingHooks) {next();} });
};

function cloneSchema(schema: Mongoose.Schema, mongoose: typeof Mongoose) {
  let clonedSchema = new mongoose.Schema();

  schema.eachPath(function(path, type) {
    if (path === ID) {
      return;
    }

    // TODO: find a better way to clone schema
    let clonedPath = {};

    clonedPath[path] = (<any>type).options;
    clonedPath[path].unique = false;
    // shadowed props are not all required
    if (path !== VERSION) {
      clonedPath[path].required = false;
    }

    clonedSchema.add(clonedPath);
  });

  return clonedSchema;
}