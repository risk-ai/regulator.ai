import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

// Dynamic imports for email components to handle different module systems
let WelcomeEmail: any, UseCaseDeepDiveEmail: any, ROIUrgencyEmail: any;

async function loadEmailComponents() {
  if (!WelcomeEmail) {
    try {
      const welcomeModule = await import('../emails/WelcomeEmail.js');
      WelcomeEmail = welcomeModule.WelcomeEmail;
      
      const useCaseModule = await import('../emails/UseCaseDeepDiveEmail.js');
      UseCaseDeepDiveEmail = useCaseModule.UseCaseDeepDiveEmail;
      
      const roiModule = await import('../emails/ROIUrgencyEmail.js');
      ROIUrgencyEmail = roiModule.ROIUrgencyEmail;
    } catch (error) {
      // Fallback: inline email generation if React components fail
      console.warn('Failed to load React email components, using fallback HTML generation');
    }
  }
}

export interface EmailData {
  firstName: string;
  email: string;
  company?: string;
  plan?: string;
  industry?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export class EmailService {
  private resendApiKey: string;

  constructor(resendApiKey?: string) {
    this.resendApiKey = resendApiKey || process.env.RESEND_API_KEY || '';
    if (!this.resendApiKey) {
      throw new Error('RESEND_API_KEY is required');
    }
  }

  /**
   * Generate Email 1: Welcome & Quick Start (sent immediately on signup)
   */
  generateWelcomeEmail(data: EmailData): EmailTemplate {
    const html = renderToStaticMarkup(
      WelcomeEmail({
        firstName: data.firstName,
        email: data.email,
        company: data.company
      })
    );

    return {
      subject: 'Welcome to Vienna OS — Your AI governance starts here',
      html: `<!DOCTYPE html>${html}`
    };
  }

  /**
   * Generate Email 2: Use Case Deep Dive (sent Day 3)
   */
  generateUseCaseDeepDiveEmail(data: EmailData): EmailTemplate {
    const industry = data.industry || 'teams';
    const html = renderToStaticMarkup(
      UseCaseDeepDiveEmail({
        firstName: data.firstName,
        email: data.email,
        industry: industry
      })
    );

    const subjectVariants = [
      `How ${industry} teams use Vienna OS for AI governance`,
      '3 ways Vienna OS prevents AI compliance disasters'
    ];

    return {
      subject: subjectVariants[0], // Use first variant for now, A/B testing can be added later
      html: `<!DOCTYPE html>${html}`
    };
  }

  /**
   * Generate Email 3: ROI & Urgency (sent Day 7)
   */
  generateROIUrgencyEmail(data: EmailData): EmailTemplate {
    const html = renderToStaticMarkup(
      ROIUrgencyEmail({
        firstName: data.firstName,
        email: data.email,
        company: data.company,
        plan: data.plan
      })
    );

    const subjectVariants = [
      'How 3 enterprises eliminated AI compliance risk with Vienna OS',
      'Customer spotlight: 99.7% audit success rate with Vienna OS'
    ];

    return {
      subject: subjectVariants[0], // Use first variant for now
      html: `<!DOCTYPE html>${html}`
    };
  }

  /**
   * Send email using Resend API
   */
  async sendEmail(
    to: string,
    template: EmailTemplate,
    from: string = 'Vienna OS <admin@regulator.ai>'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: template.subject,
          html: template.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const result = await response.json();
      return { success: true, messageId: result.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send welcome email (Email 1)
   */
  async sendWelcomeEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.generateWelcomeEmail(data);
    return this.sendEmail(data.email, template);
  }

  /**
   * Send use case deep dive email (Email 2)
   */
  async sendUseCaseDeepDiveEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.generateUseCaseDeepDiveEmail(data);
    return this.sendEmail(data.email, template);
  }

  /**
   * Send ROI & urgency email (Email 3)
   */
  async sendROIUrgencyEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.generateROIUrgencyEmail(data);
    return this.sendEmail(data.email, template);
  }
}

/**
 * Utility function to extract first name from full name
 */
export function extractFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

/**
 * Utility function to determine industry from company name or use case
 */
export function determineIndustry(company?: string, useCase?: string): string {
  if (!company && !useCase) return 'teams';
  
  const text = `${company || ''} ${useCase || ''}`.toLowerCase();
  
  if (text.includes('bank') || text.includes('finance') || text.includes('investment') || text.includes('trading')) {
    return 'financial services';
  }
  if (text.includes('health') || text.includes('medical') || text.includes('hospital') || text.includes('clinical')) {
    return 'healthcare';
  }
  if (text.includes('government') || text.includes('gov') || text.includes('public') || text.includes('agency')) {
    return 'government';
  }
  if (text.includes('manufactur') || text.includes('industrial') || text.includes('factory')) {
    return 'manufacturing';
  }
  if (text.includes('tech') || text.includes('software') || text.includes('ai') || text.includes('saas')) {
    return 'technology';
  }
  
  return 'teams';
}