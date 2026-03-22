/**
 * Execution Adapters
 * 
 * Adapters are the ONLY code with system mutation authority.
 * All file I/O, process execution, etc. routes through adapters.
 */

const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

/**
 * Base Adapter
 */
class Adapter {
  async execute(action, warrant, envelope) {
    throw new Error('Adapter must implement execute()');
  }
}

/**
 * File Adapter - Handles file operations
 */
class FileAdapter extends Adapter {
  async execute(action, warrant, envelope) {
    const { type, target, content, old_text, new_text } = action;
    
    // Resolve absolute path
    const absolutePath = this._resolvePath(target);
    
    // Create backup if modifying existing file
    if (type === 'write_file' || type === 'edit_file') {
      await this._createBackup(absolutePath);
    }
    
    switch (type) {
      case 'write_file':
        await fs.writeFile(absolutePath, content, 'utf8');
        return { path: absolutePath, bytes_written: content.length };
        
      case 'edit_file':
        const current = await fs.readFile(absolutePath, 'utf8');
        const updated = current.replace(old_text, new_text);
        await fs.writeFile(absolutePath, updated, 'utf8');
        return { path: absolutePath, changes: 1 };
        
      case 'read_file':
        const fileContent = await fs.readFile(absolutePath, 'utf8');
        return { path: absolutePath, content: fileContent };
        
      case 'delete_file':
        await fs.unlink(absolutePath);
        return { path: absolutePath, deleted: true };
        
      default:
        throw new Error(`Unknown file action: ${type}`);
    }
  }
  
  _resolvePath(target) {
    if (target.startsWith('~')) {
      return target.replace('~', process.env.HOME);
    }
    return path.resolve(target);
  }
  
  async _createBackup(filePath) {
    try {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(filePath, backupPath);
    } catch (err) {
      // File might not exist yet (write_file to new path)
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
}

/**
 * Service Adapter - Handles service operations
 */
class ServiceAdapter extends Adapter {
  constructor() {
    super();
    // Phase 7.2: State Graph integration
    this.stateGraph = null; // Set via setStateGraph()
  }
  
  /**
   * Set State Graph for persistent storage (Phase 7.2)
   * 
   * @param {StateGraph} stateGraph - State Graph instance
   */
  setStateGraph(stateGraph) {
    this.stateGraph = stateGraph;
  }
  
  async execute(action, warrant, envelope) {
    const { type, target } = action;
    
    switch (type) {
      case 'restart_service':
        await execAsync(`systemctl --user restart ${target}`);
        return { service: target, status: 'restarted' };
        
      case 'stop_service':
        await execAsync(`systemctl --user stop ${target}`);
        return { service: target, status: 'stopped' };
        
      case 'start_service':
        await execAsync(`systemctl --user start ${target}`);
        return { service: target, status: 'started' };
        
      case 'service_status':
        const { stdout } = await execAsync(`systemctl --user status ${target}`);
        return { service: target, status: stdout };
        
      default:
        throw new Error(`Unknown service action: ${type}`);
    }
  }
}

/**
 * Exec Adapter - Handles command execution
 */
class ExecAdapter extends Adapter {
  async execute(action, warrant, envelope) {
    const { command, workdir } = action;
    
    const options = {};
    if (workdir) {
      options.cwd = this._resolvePath(workdir);
    }
    
    const { stdout, stderr } = await execAsync(command, options);
    
    return {
      command,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exit_code: 0
    };
  }
  
  _resolvePath(target) {
    if (target.startsWith('~')) {
      return target.replace('~', process.env.HOME);
    }
    return path.resolve(target);
  }
}

/**
 * Read-Only Adapter - Safe operations
 */
class ReadOnlyAdapter extends Adapter {
  async execute(action, warrant, envelope) {
    const { type, target } = action;
    
    switch (type) {
      case 'read_file':
        const absolutePath = target.startsWith('~')
          ? target.replace('~', process.env.HOME)
          : path.resolve(target);
        const content = await fs.readFile(absolutePath, 'utf8');
        return { path: absolutePath, content };
        
      default:
        throw new Error(`Unknown read-only action: ${type}`);
    }
  }
}

module.exports = {
  Adapter,
  FileAdapter,
  ServiceAdapter,
  ExecAdapter,
  ReadOnlyAdapter
};
