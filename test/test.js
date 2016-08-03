const assert = require('assert');
const fs = require('vinyl-fs');
const gutil = require('gulp-util');

const markdown = require('../index');

const fixturePath = './test/fixtures/**/*.md';

const fixtureConfig = [{
  path: 'fixture.md',
  contents: new Buffer('---\ntitle: lipsum ipsum\n---\n*"dipsum"*')
}, {
  path: 'fixture.md',
  contents: new Buffer('# Titulus\n*"tipsum"*')
}, {
  path: 'fixture.md',
  contents: new Buffer('Titulus\n=======\n*"tipsum"*')
}, {
  path: 'fixture.md',
  contents: new Buffer('---\ntitle: lipsum ipsum\n---\n# Titulus\n*"tipsum"*')
}];

describe('parser', function () {
  it('should parse Markdown content and return markup wrapped in JSON', function (done) {
    const fixture = new gutil.File(fixtureConfig[0]);

    markdown()
      .on('data', function (file) {
        assert(JSON.parse(file.contents.toString()));
        done();
      })
      .write(fixture);
  });

  it('should pass on configuration objects to the marked module', function (done) {
    const fixture = new gutil.File(fixtureConfig[0]);

    markdown({
      smartypants: true
    })
    .on('data', function (file) {
      assert(file.contents.toString().match(/“/));
      done();
    })
    .write(fixture);
  });

  it('should parse YAML front matter and merge keys', function (done) {
    const fixture = new gutil.File(fixtureConfig[0]);

    markdown()
      .on('data', function (file) {
        const json = JSON.parse(file.contents.toString());
        assert(json.title);
        done();
      })
      .write(fixture);
  });

  it('should extract a title if first line of Markdown is an atx-style h1', function (done) {
    const fixture = new gutil.File(fixtureConfig[1]);

    markdown()
      .on('data', function (file) {
        const json = JSON.parse(file.contents.toString());
        assert(json.title && json.title === 'Titulus');
        done();
      })
      .write(fixture);
  });

  it('should extract a title if first line of Markdown is a setext-style h1', function (done) {
    const fixture = new gutil.File(fixtureConfig[2]);

    markdown()
      .on('data', function (file) {
        const json = JSON.parse(file.contents.toString());
        assert(json.title && json.title === 'Titulus');
        done();
      })
      .write(fixture);
  });

  it('should prefer YAML front matter titles over a extracted Markdown h1', function (done) {
    const fixture = new gutil.File(fixtureConfig[3]);

    markdown()
      .on('data', function (file) {
        const json = JSON.parse(file.contents.toString());
        assert(json.title && json.title === 'lipsum ipsum');
        done();
      })
      .write(fixture);
  });
});

describe('tree', function () {
  it('should return JSON for all Markdown in a specified directory structure', function (done) {
    fs.src(fixturePath)
      .pipe(markdown())
      .on('data', function (file) {
        assert(JSON.parse(file.contents.toString()));
      })
      .on('finish', done);
  });

  it('should consolidate output into a single file if buffered with gulp-util', function (done) {
    const stream = fs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown());

    stream.on('finish', function () {
      assert.equal(stream._readableState.length, 1);
      assert.equal(stream._readableState.buffer[0].path, '/content.json');
      done();
    });
  });

  it('should allow the single file to be renamed', function (done) {
    const stream = fs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown('blog.json', {
        smartypants: true
      }));

    stream.on('finish', function () {
      assert.equal(stream._readableState.buffer[0].path, '/blog.json');
      assert(stream._readableState.buffer[0].contents.toString().match(/“/));
      done();
    });
  });

  it('should represent the directory structure as a nested object', function (done) {
    fs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown())
      .on('data', function (file) {
        const json = JSON.parse(file.contents.toString());
        assert(json.blog.posts['oakland-activist']);
      })
      .on('finish', done);
  });
});
