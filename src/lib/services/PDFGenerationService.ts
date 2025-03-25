import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server';
import { SEOAuditReport, SEOAuditCategoryScore } from './seo-audit-service';
// For server-side rendering in Node.js environment
import { Buffer } from 'buffer';
// Optional import for server-side only
let puppeteer: any;

// Dynamic import for Puppeteer (for server-side only)
async function getPuppeteer() {
  if (!puppeteer) {
    try {
      puppeteer = await import('puppeteer');
    } catch (error) {
      console.error('Failed to import puppeteer:', error);
      throw new Error('Puppeteer is required for server-side PDF generation');
    }
  }
  return puppeteer.default;
}

export class PDFGenerationService {
  /**
   * Generate a PDF from an SEO audit report and upload it to storage
   */
  static async generatePDFFromReport(reportId: string): Promise<string> {
    // First, get the report data
    const supabase = createClient();
    
    // Get the report data
    const { data: reportData, error: reportError } = await supabase
      .from('seo_audit_reports')
      .select('*')
      .eq('id', reportId)
      .single();
      
    if (reportError || !reportData) {
      throw new Error(`Error fetching report: ${reportError?.message || 'Not found'}`);
    }
    
    // Get category scores
    const { data: scoresData, error: scoresError } = await supabase
      .from('seo_audit_scores')
      .select(`*, seo_audit_categories(name)`)
      .eq('audit_report_id', reportId);
    
    if (scoresError) {
      console.error('Error fetching scores:', scoresError);
    }
    
    // Create HTML template for the PDF
    const htmlContent = this.createReportTemplate(reportData, scoresData || []);
    
    // Convert HTML to PDF
    const pdfBlob = await this.generatePDFFromHTML(htmlContent, reportData.report_name);
    
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('seo-reports')
      .upload(`reports/${reportId}.pdf`, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });
      
    if (uploadError) {
      throw new Error(`Error uploading PDF: ${uploadError.message}`);
    }
    
    // Get public URL for the uploaded file
    const { data: urlData } = await supabase
      .storage
      .from('seo-reports')
      .getPublicUrl(`reports/${reportId}.pdf`);
      
    const pdfUrl = urlData.publicUrl;
    
    // Update the report with the PDF URL
    await supabase
      .from('seo_audit_reports')
      .update({
        pdf_url: pdfUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);
      
    return pdfUrl;
  }
  
  /**
   * Generate a PDF from HTML content
   */
  private static async generatePDFFromHTML(htmlContent: string, title: string): Promise<Blob> {
    // Create a temporary container to render the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlContent;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    
    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Initialize PDF with A4 size
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      pdf.setFontSize(22);
      pdf.text(title, 20, 20);
      
      // Add generation date
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
      
      // Add image of rendered HTML content
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 190; // A4 width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', 10, 40, imgWidth, imgHeight);
      
      // Generate the PDF as a blob
      return pdf.output('blob');
    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  }
  
  /**
   * Server-side PDF generation implementation using Puppeteer
   * This will be used when we don't have access to the browser
   */
  static async generatePDFFromReportServerSide(reportId: string): Promise<string> {
    try {
      // Use the server client for server-side operations
      const supabase = createServerClient();
      
      // Get the report data
      const { data: reportData, error: reportError } = await supabase
        .from('seo_audit_reports')
        .select('*')
        .eq('id', reportId)
        .single();
        
      if (reportError || !reportData) {
        throw new Error(`Error fetching report: ${reportError?.message || 'Not found'}`);
      }
      
      // Get category scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('seo_audit_scores')
        .select(`*, seo_audit_categories(name)`)
        .eq('audit_report_id', reportId);
      
      if (scoresError) {
        console.error('Error fetching scores:', scoresError);
      }
      
      // Create HTML template for the PDF
      const htmlContent = this.createReportTemplate(reportData, scoresData || []);
      
      // Get puppeteer instance
      const puppeteerInstance = await getPuppeteer();
      
      // Launch a headless browser
      const browser = await puppeteerInstance.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        // Create a new page
        const page = await browser.newPage();
        
        // Set content to our HTML template
        await page.setContent(htmlContent, {
          waitUntil: 'networkidle0'
        });
        
        // Set viewport for the page
        await page.setViewport({
          width: 1280,
          height: 1024,
          deviceScaleFactor: 1
        });
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
          }
        });
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('seo-reports')
          .upload(`reports/${reportId}.pdf`, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });
          
        if (uploadError) {
          throw new Error(`Error uploading PDF: ${uploadError.message}`);
        }
        
        // Get public URL for the uploaded file
        const { data: urlData } = await supabase
          .storage
          .from('seo-reports')
          .getPublicUrl(`reports/${reportId}.pdf`);
          
        const pdfUrl = urlData.publicUrl;
        
        // Update the report with the PDF URL
        await supabase
          .from('seo_audit_reports')
          .update({
            pdf_url: pdfUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', reportId);
          
        return pdfUrl;
      } finally {
        // Always close the browser
        await browser.close();
      }
    } catch (error) {
      console.error('Error generating PDF server-side:', error);
      throw error;
    }
  }
  
  /**
   * Create HTML template for the report
   */
  private static createReportTemplate(
    reportData: any, 
    scoresData: any[]
  ): string {
    const report = reportData.report_data || {};
    const reportName = reportData.report_name;
    const dateCreated = new Date(reportData.created_at).toLocaleDateString();
    
    // Map scores for easier access
    const scores: Record<string, {score: number, grade: string}> = {};
    scoresData.forEach(scoreData => {
      const categoryName = scoreData.seo_audit_categories?.name?.toLowerCase() || 'unknown';
      scores[categoryName] = {
        score: scoreData.score,
        grade: scoreData.grade
      };
    });
    
    // Calculate overall score (average of all scores)
    let overallScore = 0;
    let overallGrade = 'N/A';
    
    if (scoresData.length > 0) {
      overallScore = Math.round(
        scoresData.reduce((sum, score) => sum + score.score, 0) / scoresData.length
      );
      overallGrade = this.scoreToGrade(overallScore);
    }
    
    // Get issue summary
    const summary = report.summary || {
      totalIssues: 0,
      criticalIssues: 0,
      warningIssues: 0,
      infoIssues: 0
    };
    
    // Get recommendations
    const recommendations = report.recommendations || {};
    
    // Import CSS styles for report
    // In a production application, you'd typically load this from a file
    const cssStyles = `
      /* PDF Report Styling */
      .seo-report {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #333;
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .report-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 20px;
      }
      
      .report-header h1 {
        font-size: 28px;
        margin-bottom: 10px;
        color: #2563eb;
      }
      
      .summary-section {
        margin-bottom: 40px;
        background-color: #f9fafb;
        border-radius: 8px;
        padding: 20px;
      }
      
      .summary-section h2 {
        font-size: 24px;
        margin-bottom: 20px;
        color: #1e40af;
      }
      
      .score-cards {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 30px;
      }
      
      .score-card {
        background-color: white;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        min-width: 150px;
        text-align: center;
        flex: 1 1 150px;
      }
      
      .score-card h3 {
        font-size: 16px;
        margin-bottom: 10px;
        color: #4b5563;
      }
      
      .score {
        font-size: 32px;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 5px;
      }
      
      .grade {
        font-size: 20px;
        font-weight: bold;
      }
      
      .grade-a {
        color: #10b981;
      }
      
      .grade-b {
        color: #6366f1;
      }
      
      .grade-c {
        color: #f59e0b;
      }
      
      .grade-d {
        color: #ef4444;
      }
      
      .grade-f {
        color: #b91c1c;
      }
      
      .issues-summary {
        margin-top: 20px;
        background-color: white;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      
      .issues-summary h3 {
        font-size: 18px;
        margin-bottom: 10px;
        color: #4b5563;
      }
      
      .issues-summary ul {
        padding-left: 20px;
      }
      
      .issues-summary li {
        margin-bottom: 5px;
      }
      
      .recommendations-section {
        margin-bottom: 40px;
      }
      
      .recommendations-section h2 {
        font-size: 24px;
        margin-bottom: 20px;
        color: #1e40af;
      }
      
      .category-recommendations {
        background-color: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
      }
      
      .category-recommendations h3 {
        font-size: 18px;
        margin-bottom: 15px;
        color: #4b5563;
      }
      
      .category-recommendations ul {
        padding-left: 20px;
      }
      
      .category-recommendations li {
        margin-bottom: 10px;
        line-height: 1.5;
      }
      
      .details-section {
        margin-bottom: 40px;
      }
      
      .details-section h2 {
        font-size: 24px;
        margin-bottom: 20px;
        color: #1e40af;
      }
      
      .category-details {
        background-color: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
      }
      
      .category-details h3 {
        font-size: 18px;
        margin-bottom: 15px;
        color: #4b5563;
      }
      
      .issues-list table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }
      
      .issues-list th, 
      .issues-list td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .issues-list th {
        background-color: #f9fafb;
        font-weight: 600;
      }
      
      .issues-list tr.severity-high td {
        color: #b91c1c;
        background-color: #fee2e2;
      }
      
      .issues-list tr.severity-medium td {
        color: #b45309;
        background-color: #fef3c7;
      }
      
      .issues-list tr.severity-low td {
        color: #3b82f6;
        background-color: #eff6ff;
      }
      
      .footer {
        text-align: center;
        margin-top: 50px;
        padding-top: 20px;
        border-top: 2px solid #f0f0f0;
        color: #6b7280;
        font-size: 14px;
      }
    `;
    
    // Helper function to get grade class
    const getGradeClass = (grade: string): string => {
      if (grade.startsWith('A')) return 'grade-a';
      if (grade.startsWith('B')) return 'grade-b';
      if (grade.startsWith('C')) return 'grade-c';
      if (grade.startsWith('D')) return 'grade-d';
      return 'grade-f';
    };
    
    // Create HTML content
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${reportName} - SEO Audit Report</title>
        <style>${cssStyles}</style>
      </head>
      <body>
        <div class="seo-report">
          <div class="report-header">
            <h1>${reportName}</h1>
            <p>Created: ${dateCreated}</p>
          </div>
          
          <div class="summary-section">
            <h2>Overall Score: ${overallScore} <span class="${getGradeClass(overallGrade)}">(${overallGrade})</span></h2>
            
            <div class="score-cards">
              ${Object.entries(scores).map(([category, data]) => `
                <div class="score-card">
                  <h3>${this.capitalizeFirstLetter(category)}</h3>
                  <div class="score">${data.score}</div>
                  <div class="${getGradeClass(data.grade)}">${data.grade}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="issues-summary">
              <h3>Issues Found:</h3>
              <ul>
                <li>Critical Issues: ${summary.criticalIssues}</li>
                <li>Warning Issues: ${summary.warningIssues}</li>
                <li>Info Issues: ${summary.infoIssues}</li>
                <li>Total Issues: ${summary.totalIssues}</li>
              </ul>
            </div>
          </div>
          
          <div class="recommendations-section">
            <h2>Top Recommendations</h2>
            ${Object.entries(recommendations).map(([category, recs]) => `
              <div class="category-recommendations">
                <h3>${this.capitalizeFirstLetter(category)}</h3>
                <ul>
                  ${(recs as string[]).map(rec => `<li>${rec}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
          
          <div class="details-section">
            <h2>Detailed Analysis</h2>
            ${Object.entries(report.categories || {}).map(([category, data]) => {
              return `
                <div class="category-details">
                  <h3>${this.capitalizeFirstLetter(category)}</h3>
                  <div class="issues-list">
                    ${this.renderIssuesList(data)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="footer">
            <p>Generated by SEOMax - ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Render issues list for a category
   */
  private static renderIssuesList(categoryData: any): string {
    if (!categoryData || !categoryData.issues || !Array.isArray(categoryData.issues)) {
      return '<p>No issues found.</p>';
    }
    
    return `
      <table>
        <thead>
          <tr>
            <th>Issue</th>
            <th>Severity</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          ${categoryData.issues.map((issue: any) => `
            <tr class="severity-${issue.issue_severity || 'low'}">
              <td>${issue.issue_description}</td>
              <td>${this.capitalizeFirstLetter(issue.issue_severity || 'low')}</td>
              <td>${issue.url || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  /**
   * Utility: Capitalize first letter of a string
   */
  private static capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  /**
   * Utility: Convert score to letter grade
   */
  private static scoreToGrade(score: number): string {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  }
} 