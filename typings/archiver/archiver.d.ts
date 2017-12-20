// Type definitions for archiver v0.15.0
// Project: https://github.com/archiverjs/node-archiver
// Definitions by: Esri <https://github.com/archiverjs/node-archiver>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/* =================== USAGE ===================

    import Archiver = require('archiver);
    var archiver = Archiver.create('zip');
    archiver.pipe(FS.createWriteStream('xxx'));
    archiver.append(FS.createReadStream('xxx'));
    archiver.finalize();

 =============================================== */

declare module "archiver" {
    import * as stream from "stream";
    import * as glob from "glob";
    import { ZlibOptions } from "zlib";

    interface nameInterface {
        name?: string;
    }

    interface EntryData {
        name?: string;
        prefix?: string;
        stats?: string;
    }
    
    /** A function that lets you either opt out of including an entry (by returning false), or modify the contents of an entry as it is added (by returning an EntryData) */
    type EntryDataFunction = (entry: EntryData) => false | EntryData;

    interface Archiver extends stream.Transform {
        abort(): this;
        append(source: stream.Readable | Buffer | string, name?: EntryData): this;

        /** if false is passed for destpath, the path of a chunk of data in the archive is set to the root */
        directory(dirpath: string, destpath: false | string, data?: EntryData | EntryDataFunction): this;
        file(filename: string, data: EntryData): this;
        glob(pattern: string, options?: glob.IOptions, data?: EntryData): this;
        finalize(): Promise<void>;

        setFormat(format: string): this;
        setModule(module: Function): this;

        pointer(): number;
        use(plugin: Function): this;

        symlink(filepath: string, target: string): this;
    }

    interface Options {}

    function archiver(format: string, options?: Options): Archiver;

    namespace archiver {
        function create(format: string, options?: Options): Archiver;
    }

    export = archiver;
}
