const fs = require('fs');
const multer = require('multer');
const fileSizeLimit = 209715200; // 200MB
const crypto = require('crypto');
const mime = require('mime');
const unzip = require('unzip');

const mainUploader = multer({
    limits: { fileSize: fileSizeLimit },
    dest: uploadFolder
});


const pdfStorage = multer.diskStorage({
    destination: uploadFolder,
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
            cb(null, file.originalname + '-' + raw.toString('hex') + '.' + mime.extension(file.mimetype));
        });
    },
})

const pdfUploader = multer({
    limits: { fileSize: fileSizeLimit },
    storage: pdfStorage
});


module.exports = function (app, databaseLayer, webSocketMessenger) {
    const fileProcessor = requireFromRoot('src/import/FileProcess.js')(databaseLayer);
    const emailer = new (requireFromRoot('src/utils/Email.js'))();

    /* Handles the source file upload */
    app.post('/api/v1/orgs/:org_id/facilities/:facility_id/upload', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id].upload) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }
        
        // Prevents requests from failing for big source files.
        req.connection.setTimeout(1800000);

        var mainUploadFunction = mainUploader.array('file');

        mainUploadFunction(req, res, function (err) {
            if (err) {
                var err = new totemError.ErrorInvalidRequest('File size exceeds the 200 MB limit', { url: req.url, userId: res.locals.userId });

                res.status(err.httpCode()).json({ error: err.message() });
                return;
            } else {
                var temporaryFilePath = req.files[0].path;
                var fileName = req.files[0].originalname;
                var timestamp = req.body.timestamp;
                var organizationId = req.params.org_id;
                var facilityId = req.params.facility_id;
                var fileType = req.body.fileType;

                if (!req.files) {
                    var err = new totemError.ErrorInvalidRequest('No files were uploaded', { url: req.url, userId: res.locals.userId });

                    res.status(err.httpCode()).json({ error: err.message() });
                    return;
                }

                var processFile = function (filePath) {
                    fileProcessor.process(res.locals.userId, organizationId, facilityId, filePath, fileName, fileType, timestamp, function (result) {
                        fs.stat(filePath, function (err, stat) {
                            if (err == null) {
                                fs.unlink(filePath);
                            }
                        });

                        if (result.error) {
                            res.status(result.error.httpCode()).json({ error: result.error.message() });
                            return;
                        } else {
                            webSocketMessenger.sendMessage('organizationChanged', { organizationId: req.params.org_id });
                            res.status(200).json(result);
                        }
                    });
                };

                // if user uploads a .bog file, unzip it first
                if (fileName.length - fileName.lastIndexOf('.bog') == 4) {
                    var unzippedFilePath = '';

                    fs.createReadStream(temporaryFilePath).pipe(unzip.Parse())
                        .on('entry', function (entry) {
                            unzippedFilePath = uploadFolder + '/' + crypto.randomBytes(32).toString('hex');

                            entry.pipe(fs.createWriteStream(unzippedFilePath));

                            fs.stat(temporaryFilePath, function (err, stat) {
                                if (err == null) {
                                    fs.unlink(temporaryFilePath);
                                }
                            });
                        })
                        .on('close', function () {
                            setTimeout(function () { processFile(unzippedFilePath); }, 100);
                        });
                } else {
                    processFile(temporaryFilePath);
                }
            }
        });
    });

    /* Handles a single pdf file upload and sending it as an email attachment */
    app.post('/api/v1/email', function (req, res) {
        // Prevents requests from failing for big source files.
        req.connection.setTimeout(1800000);

        var pdfUploadFunction = pdfUploader.single('blob');

        pdfUploadFunction(req, res, function (err) {
            if (err) {
                var err = new totemError.ErrorInvalidRequest('File size exceeds the 200 MB limit', { url: req.url, userId: res.locals.userId });

                res.status(err.httpCode()).json({ error: err.message() });
                return;
            } else {
                var temporaryFilePath = req.file.path;
                var fileName = req.file.originalname;

                if (!req.file) {
                    var err = new totemError.ErrorInvalidRequest('No files were uploaded', { url: req.url, userId: res.locals.userId });

                    res.status(err.httpCode()).json({ error: err.message() });
                    return;
                }

                // Find user by id to get the username and email address
                databaseLayer.users.findUserById(res.locals.userId, function (findUserByIdResult) {
                    if (findUserByIdResult.error) {
                        res.status(findUserByIdResult.error.httpCode()).json({ error: findUserByIdResult.error.message() });
                    } else {
                        var user = findUserByIdResult.data;

                        emailer.sendAssessmentEmail(user.username, user.email, temporaryFilePath, function (result) {
                            fs.stat(temporaryFilePath, function (err, stat) {
                                if (err == null) {
                                    fs.unlink(temporaryFilePath);
                                }
                            });

                            if (result.error) {
                                res.status(result.error.httpCode()).json({ error: result.error.message() });
                                return;
                            } else {
                                res.status(200).json(result);
                            }
                        });
                    }
                });
            }
        });
    });
};