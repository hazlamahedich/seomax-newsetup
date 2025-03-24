/**
 * Test script to generate a PDF from an existing audit report
 * 
 * Usage:
 * npx ts-node scripts/generate-test-pdf.ts REPORT_ID
 */

import { PDFGenerationService } from '../src/lib/services/PDFGenerationService';

async function main() {
  // Get report ID from command line arguments
  const reportId = process.argv[2];
  
  if (!reportId) {
    console.error('Error: Report ID is required.');
    console.log('Usage: npx ts-node scripts/generate-test-pdf.ts REPORT_ID');
    process.exit(1);
  }
  
  console.log(`Generating PDF for report ID: ${reportId}`);
  
  try {
    // Generate PDF
    const pdfUrl = await PDFGenerationService.generatePDFFromReportServerSide(reportId);
    
    console.log('PDF generated successfully!');
    console.log(`PDF URL: ${pdfUrl}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating PDF:', error);
    process.exit(1);
  }
}

main(); 