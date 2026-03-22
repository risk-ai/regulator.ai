/**
 * Envelope System
 * 
 * Envelopes are structured proposals for system mutations.
 * Agents propose envelopes, executor validates and executes them.
 */

const crypto = require('crypto');

class EnvelopeSystem {
  /**
   * Create new envelope
   * 
   * @param {object} options - Envelope options
   * @returns {object} Envelope
   */
  static create(options) {
    const {
      warrant_id,
      objective,
      actions,
      proposed_by = 'vienna',
      fail_fast = true
    } = options;
    
    const envelope_id = this._generateEnvelopeId();
    
    const envelope = {
      envelope_id,
      warrant_id,
      proposed_by,
      proposed_at: new Date().toISOString(),
      objective,
      actions,
      fail_fast
    };
    
    this.validate(envelope);
    
    return envelope;
  }
  
  /**
   * Validate envelope structure
   * 
   * @param {object} envelope - Envelope to validate
   * @throws {Error} If envelope invalid
   */
  static validate(envelope) {
    const required = ['envelope_id', 'warrant_id', 'objective', 'actions'];
    const missing = required.filter(f => !envelope[f]);
    
    if (missing.length > 0) {
      throw new Error(`Invalid envelope: missing ${missing.join(', ')}`);
    }
    
    if (!Array.isArray(envelope.actions) || envelope.actions.length === 0) {
      throw new Error('Invalid envelope: must have at least one action');
    }
    
    // Validate each action
    for (const action of envelope.actions) {
      this._validateAction(action);
    }
    
    return true;
  }
  
  /**
   * Validate single action
   */
  static _validateAction(action) {
    if (!action.type) {
      throw new Error('Invalid action: missing type');
    }
    
    if (!action.target) {
      throw new Error('Invalid action: missing target');
    }
    
    // Type-specific validation
    switch (action.type) {
      case 'write_file':
        if (!action.content) {
          throw new Error('write_file action requires content');
        }
        break;
        
      case 'edit_file':
        if (!action.old_text || !action.new_text) {
          throw new Error('edit_file action requires old_text and new_text');
        }
        break;
        
      case 'exec_command':
        if (!action.command) {
          throw new Error('exec_command action requires command');
        }
        break;
    }
  }
  
  /**
   * Generate envelope ID
   */
  static _generateEnvelopeId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(3).toString('hex');
    return `env_${timestamp}_${random}`;
  }
}

module.exports = EnvelopeSystem;
