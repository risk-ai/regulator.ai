/**
 * Files Routes
 *
 * Workspace file operations through Vienna governance.
 * All mutations create envelopes with warrants.
 */
import { Router } from 'express';
import multer from 'multer';
// Configure multer for memory storage (files as buffers)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max per file
        files: 10, // Max 10 files per request
    },
    fileFilter: (req, file, cb) => {
        // Allow most common types, block executables
        const blocked = /\.(exe|bat|cmd|sh|ps1|dll|so|dylib)$/i;
        if (blocked.test(file.originalname)) {
            cb(new Error(`File type not allowed: ${file.originalname}`));
        }
        else {
            cb(null, true);
        }
    },
});
export function createFilesRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/files/list
     * List files in directory
     */
    router.get('/list', async (req, res) => {
        try {
            const path = req.query.path || '/';
            const operator = req.session?.operator || 'unknown';
            const result = await vienna.listFiles({
                path,
                operator,
            });
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[FilesRoute] List error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'FILE_LIST_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * POST /api/v1/files/upload
     * Upload files (creates envelopes + verification)
     */
    router.post('/upload', upload.array('files', 10), async (req, res) => {
        try {
            const files = req.files;
            const targetPath = req.body.targetPath || '/uploads';
            const operator = req.session?.operator || 'unknown';
            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'No files provided',
                    code: 'NO_FILES',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await vienna.uploadFiles({
                files: files.map(f => ({
                    originalname: f.originalname,
                    buffer: f.buffer,
                    mimetype: f.mimetype,
                    size: f.size,
                })),
                targetPath,
                operator,
            });
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[FilesRoute] Upload error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'FILE_UPLOAD_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/files/read
     * Read file contents
     */
    router.get('/read', async (req, res) => {
        try {
            const path = req.query.path;
            const operator = req.session?.operator || 'unknown';
            if (!path) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required parameter: path',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await vienna.readFile({
                path,
                operator,
            });
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[FilesRoute] Read error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'FILE_READ_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * POST /api/v1/files/write
     * Write file contents (creates envelope + warrant)
     */
    router.post('/write', async (req, res) => {
        try {
            const { path, content, createOnly } = req.body;
            const operator = req.session?.operator || 'unknown';
            if (!path) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required field: path',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await vienna.writeFile({
                path,
                content: content || '',
                createOnly: createOnly || false,
                operator,
            });
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[FilesRoute] Write error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'FILE_WRITE_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * DELETE /api/v1/files/delete
     * Delete file (creates envelope + warrant)
     */
    router.delete('/delete', async (req, res) => {
        try {
            const path = req.query.path;
            const operator = req.session?.operator || 'unknown';
            if (!path) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required parameter: path',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await vienna.deleteFile({
                path,
                operator,
            });
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[FilesRoute] Delete error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'FILE_DELETE_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * POST /api/v1/files/search
     * Search files by content or name
     */
    router.post('/search', async (req, res) => {
        try {
            const { query, path, contentSearch } = req.body;
            const operator = req.session?.operator || 'unknown';
            if (!query) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required field: query',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const result = await vienna.searchFiles({
                query,
                path: path || '/',
                contentSearch: contentSearch || false,
                operator,
            });
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[FilesRoute] Search error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'FILE_SEARCH_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=files.js.map