import 'mocha';
import { assert } from 'chai'
import vermongo = require('../src/index');
import * as Bluebird from 'bluebird';
import * as mongoose from 'mongoose';
declare module 'mongoose' {
  type Promise<T> = Bluebird<T>;
}
(<any>mongoose).Promise = Bluebird;

let pageSchema = new mongoose.Schema({
  title : { type : String, required : true},
  content : { type : String, required : true },
  path : { type : String, required : true},
  tags : [String],
  lastModified : Date,
  created : Date
});

interface IPage extends mongoose.Document {
  title: string,
  content: string,
  path: string,
  tages: string[],
  lastModified?: number,
  created?: number
}

let pageVermongoSchema = new mongoose.Schema({
  _id: {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    _version: { type: Number, required: true }
  },
  _version: { type: Number, required: true },
  title : String,
  content : String,
  path : String,
  tags : [String],
  lastModified : Date,
  created : Date
});

interface IPageVermongo extends mongoose.Document {
  _id: {
    _id: mongoose.Types.ObjectId,
    _version: number
  },
  _version: number,
  title?: string,
  content?: string,
  path?: string,
  tages?: string[],
  lastModified?: number,
  created?: number
}

// Test suite
describe('vermongo tests', () => {
  let Page: mongoose.Model<IPage>;
  let PageVermongo: mongoose.Model<IPageVermongo>;

  // Connect to mongodb before running tests
  before((done) => {
    pageSchema.plugin(vermongo, "pageschemas.vermongo");
    Page = mongoose.model<IPage>('pageschema', pageSchema);
    PageVermongo = mongoose.model<IPageVermongo>('pageschemas.vermongo');

    mongoose.connect('mongodb://localhost/mongotest');
    mongoose.connection.on('connected', () => {
      done();
    });
  })

  it('creating an entry should not create a vermongo entry', (done) => {
    let page = new Page({ title: "test", content: "foobar", path: "lala", tags: ["a", "b"] });
    page.save()
      .then(()=> {
        return PageVermongo.find({});
      })
      .then((result) => {
        assert(result.length === 0, "not expecting a vermongo entry on first create");
        done();
      })
      .catch((e) => {
        done(e);
      })
  });

  it('saving an entry should create a vermongo entry', (done) => {
    let pageID: mongoose.Types.ObjectId;
    let page = new Page({ title: "foo", content: "bar", path: "baz", tags: ["a", "b", "c"] });
    page.save()
      .then((page) => {
        pageID = page._id;
        page.title = "foo 2";
        return page.save();
      })
      .then(()=> {
        return PageVermongo.find({});
      })
      .then((result) => {
        assert(result.length === 1, "expecting a vermongo entry on update");
        assert(result[0].title === "foo", "expecting a vermongo entry on update");
        assert(result[0].content === "bar", "expecting a vermongo entry on update");
        assert(result[0].path === "baz", "expecting a vermongo entry on update");
        assert(result[0]._version === 1, "expecting a vermongo entry on update");
        assert(result[0]._id._version === 1, "expecting a vermongo entry on update");
        assert(pageID.equals(result[0]._id._id), "expecting a vermongo entry on update");
        done();
      })
      .catch((e) => {
        done(e);
      })
  });

  it('updating an entry should create a vermongo entry', function (done) {
    this.timeout(10000);
    let pageID: mongoose.Types.ObjectId;
    let page = new Page({ title: "foo", content: "bar", path: "baz", tags: ["a", "b", "c"] });
    page.save()
      .then((page: IPage) => {
        pageID = page._id;
        return Page.findOneAndUpdate({_id: page._id},{title: "foo 2"}, function(err, res) {
          
          if(err) { done(err); }

          PageVermongo.find({}, function(err, result) {
            if(err) done(err);
            assert(result.length === 1, "expecting a vermongo entry on update");
            assert(result[0].title === "foo", "changed field title was not correctly updated");
            assert(result[0].content === "bar", "unchanged field content was not correctly updated");
            assert(result[0].path === "baz", "unchanged field path was not correctly updated");
            assert(result[0]._version === 1, "field _version was not correctly updated");
            assert(result[0]._id._version === 1, "historical field _version was not correctly updated");
            assert(pageID.equals(result[0]._id._id), "historical field _id was not correctly set");
            done();
          });
        });
      })


  })

  // Not particularly useful for travis but important for local dev
  afterEach((done) => {
    mongoose.connection.db.dropDatabase()
      .then(() => {
        done();
      })
      .catch((e) => {
        done(e);
      })
  })

});
