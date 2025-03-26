import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFGenerationService } from '@/lib/services/pdf-generation-service';
import puppeteer from 'puppeteer';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    
    // Verify auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request
    const { contentPageId } = await req.json();
    
    if (!contentPageId) {
      return NextResponse.json(
        { error: 'Content page ID is required' },
        { status: 400 }
      );
    }
    
    // Get content page data
    const { data: contentPage, error: contentError } = await supabase
      .from('content_pages')
      .select('*')
      .eq('id', contentPageId)
      .single();
      
    if (contentError || !contentPage) {
      return NextResponse.json(
        { error: 'Content page not found', details: contentError?.message },
        { status: 404 }
      );
    }
    
    // Get latest content analysis
    const { data: analyses, error: analysisError } = await supabase
      .from('content_analysis')
      .select('*')
      .eq('page_id', contentPageId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (analysisError) {
      return NextResponse.json(
        { error: 'Error fetching content analysis', details: analysisError.message },
        { status: 500 }
      );
    }
    
    const analysis = analyses?.[0];
    if (!analysis) {
      return NextResponse.json(
        { error: 'No analysis found for this content' },
        { status: 404 }
      );
    }
    
    // Generate PDF using server-side rendering
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      // Create HTML template for the PDF
      const htmlContent = createReportTemplate(contentPage, analysis);
      
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
        .from('content-analysis')
        .upload(`reports/${contentPageId}.pdf`, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });
        
      if (uploadError) {
        throw new Error(`Error uploading PDF: ${uploadError.message}`);
      }
      
      // Get public URL for the uploaded file
      const { data: urlData } = await supabase
        .storage
        .from('content-analysis')
        .getPublicUrl(`reports/${contentPageId}.pdf`);
        
      const pdfUrl = urlData.publicUrl;
      
      // Update the content page with the PDF URL
      await supabase
        .from('content_pages')
        .update({
          pdf_url: pdfUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentPageId);
        
      return NextResponse.json({ 
        success: true,
        pdfUrl
      });
    } finally {
      // Always close the browser
      await browser.close();
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'PDF generation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function createReportTemplate(contentPage: any, analysis: any): string {
  const result = analysis.result || {};
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Content Analysis - ${contentPage.title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          line-height: 1.6;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .report-header {
          text-align: center;
          padding-bottom: 20px;
          margin-bottom: 30px;
          border-bottom: 2px solid #f0f0f0;
        }
        
        .report-header h1 {
          color: #2563eb;
          margin-bottom: 10px;
        }
        
        .score-section {
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .score-section h2 {
          color: #1e40af;
          margin-bottom: 20px;
        }
        
        .score-cards {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .score-card {
          background-color: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          min-width: 150px;
          flex: 1;
          text-align: center;
        }
        
        .score-card h3 {
          color: #4b5563;
          margin-bottom: 10px;
        }
        
        .score {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 5px;
        }
        
        .analysis-section {
          margin-bottom: 30px;
        }
        
        .analysis-section h2 {
          color: #1e40af;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .metric-item {
          background-color: #f9fafb;
          padding: 10px;
          border-radius: 4px;
        }
        
        .metric-item .label {
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 5px;
        }
        
        .recommendations {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }
        
        .recommendations h3 {
          color: #4b5563;
          margin-bottom: 15px;
        }
        
        .recommendations ul {
          padding-left: 20px;
        }
        
        .recommendations li {
          margin-bottom: 10px;
        }
        
        .summary-box {
          background-color: #eff6ff;
          border-left: 4px solid #2563eb;
          padding: 15px;
          margin: 20px 0;
        }
        
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <h1>Content Analysis Report</h1>
        <p>${contentPage.title}</p>
        <p>${contentPage.url}</p>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="score-section">
        <h2>Content Score Overview</h2>
        <div class="score-cards">
          <div class="score-card">
            <h3>Overall Score</h3>
            <div class="score">${result.content_score || 0}</div>
          </div>
          ${result.readability_analysis ? `
          <div class="score-card">
            <h3>Readability</h3>
            <div class="score">${result.readability_analysis.readability_score || 0}</div>
          </div>
          ` : ''}
          ${result.keyword_analysis ? `
          <div class="score-card">
            <h3>Keyword Usage</h3>
            <div class="score">${result.keyword_analysis.optimization_score || 0}</div>
          </div>
          ` : ''}
          ${result.structure_analysis ? `
          <div class="score-card">
            <h3>Structure</h3>
            <div class="score">${result.structure_analysis.structure_score || 0}</div>
          </div>
          ` : ''}
        </div>
        
        <div class="summary-box">
          ${result.recommendations && result.recommendations.length > 0 ? `
            <p>Our analysis found ${result.recommendations.length} recommendations to improve your content.</p>
          ` : `
            <p>Content analysis completed successfully.</p>
          `}
        </div>
      </div>
      
      ${result.readability_analysis ? `
      <div class="analysis-section">
        <h2>Readability Analysis</h2>
        
        <div class="metric-grid">
          <div class="metric-item">
            <div class="label">Reading Level</div>
            <div>${result.readability_analysis.reading_level || 'Unknown'}</div>
          </div>
          <div class="metric-item">
            <div class="label">Readability Score</div>
            <div>${result.readability_analysis.readability_score || 0}/100</div>
          </div>
          <div class="metric-item">
            <div class="label">Sentence Complexity</div>
            <div>${result.readability_analysis.sentence_complexity_score || 0}/100</div>
          </div>
          <div class="metric-item">
            <div class="label">Vocabulary Score</div>
            <div>${result.readability_analysis.vocabulary_score || 0}/100</div>
          </div>
        </div>
        
        <div class="summary-box">
          <p>${result.readability_analysis.analysis_summary || 'No readability analysis summary available.'}</p>
        </div>
        
        ${result.readability_analysis.recommendations && result.readability_analysis.recommendations.length > 0 ? `
        <div class="recommendations">
          <h3>Readability Recommendations</h3>
          <ul>
            ${result.readability_analysis.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      ${result.keyword_analysis ? `
      <div class="analysis-section">
        <h2>Keyword Analysis</h2>
        
        <div class="metric-grid">
          <div class="metric-item">
            <div class="label">Optimization Score</div>
            <div>${result.keyword_analysis.optimization_score || 0}/100</div>
          </div>
          <div class="metric-item">
            <div class="label">Natural Usage</div>
            <div>${result.keyword_analysis.natural_usage_score || 0}/100</div>
          </div>
        </div>
        
        ${result.keyword_analysis.keyword_placement ? `
        <h3>Keyword Placement</h3>
        <div class="metric-grid">
          <div class="metric-item">
            <div class="label">Title</div>
            <div>${result.keyword_analysis.keyword_placement.title ? 'Yes' : 'No'}</div>
          </div>
          <div class="metric-item">
            <div class="label">Headings</div>
            <div>${result.keyword_analysis.keyword_placement.headings ? 'Yes' : 'No'}</div>
          </div>
          <div class="metric-item">
            <div class="label">Introduction</div>
            <div>${result.keyword_analysis.keyword_placement.intro ? 'Yes' : 'No'}</div>
          </div>
          <div class="metric-item">
            <div class="label">Body</div>
            <div>${result.keyword_analysis.keyword_placement.body ? 'Yes' : 'No'}</div>
          </div>
          <div class="metric-item">
            <div class="label">Conclusion</div>
            <div>${result.keyword_analysis.keyword_placement.conclusion ? 'Yes' : 'No'}</div>
          </div>
        </div>
        ` : ''}
        
        ${result.keyword_analysis.related_keywords && result.keyword_analysis.related_keywords.length > 0 ? `
        <h3>Related Keywords</h3>
        <div class="metric-grid">
          ${result.keyword_analysis.related_keywords.map((keyword: string) => `
            <div class="metric-item">
              <div>${keyword}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <div class="summary-box">
          <p>${result.keyword_analysis.analysis_summary || 'No keyword analysis summary available.'}</p>
        </div>
        
        ${result.keyword_analysis.recommendations && result.keyword_analysis.recommendations.length > 0 ? `
        <div class="recommendations">
          <h3>Keyword Recommendations</h3>
          <ul>
            ${result.keyword_analysis.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      ${result.structure_analysis ? `
      <div class="analysis-section">
        <h2>Structure Analysis</h2>
        
        <div class="metric-grid">
          <div class="metric-item">
            <div class="label">Structure Score</div>
            <div>${result.structure_analysis.structure_score || 0}/100</div>
          </div>
          <div class="metric-item">
            <div class="label">Formatting Score</div>
            <div>${result.structure_analysis.formatting_score || 0}/100</div>
          </div>
          <div class="metric-item">
            <div class="label">Organization Score</div>
            <div>${result.structure_analysis.organization_score || 0}/100</div>
          </div>
          <div class="metric-item">
            <div class="label">Intro/Conclusion</div>
            <div>${result.structure_analysis.intro_conclusion_score || 0}/100</div>
          </div>
        </div>
        
        ${result.structure_analysis.heading_hierarchy ? `
        <h3>Heading Structure</h3>
        <div class="metric-grid">
          <div class="metric-item">
            <div class="label">H1 Tags</div>
            <div>${result.structure_analysis.heading_hierarchy.h1_count || 0}</div>
          </div>
          <div class="metric-item">
            <div class="label">H2 Tags</div>
            <div>${result.structure_analysis.heading_hierarchy.h2_count || 0}</div>
          </div>
          <div class="metric-item">
            <div class="label">H3 Tags</div>
            <div>${result.structure_analysis.heading_hierarchy.h3_count || 0}</div>
          </div>
          <div class="metric-item">
            <div class="label">Correct Hierarchy</div>
            <div>${result.structure_analysis.heading_hierarchy.hierarchy_correct ? 'Yes' : 'No'}</div>
          </div>
        </div>
        ` : ''}
        
        ${result.structure_analysis.content_gaps && result.structure_analysis.content_gaps.length > 0 ? `
        <h3>Content Gaps</h3>
        <div class="recommendations">
          <ul>
            ${result.structure_analysis.content_gaps.map((gap: string) => `<li>${gap}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        
        <div class="summary-box">
          <p>${result.structure_analysis.analysis_summary || 'No structure analysis summary available.'}</p>
        </div>
        
        ${result.structure_analysis.recommendations && result.structure_analysis.recommendations.length > 0 ? `
        <div class="recommendations">
          <h3>Structure Recommendations</h3>
          <ul>
            ${result.structure_analysis.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      ${result.recommendations && result.recommendations.length > 0 ? `
      <div class="analysis-section">
        <h2>Overall Recommendations</h2>
        <div class="recommendations">
          <ul>
            ${result.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      </div>
      ` : ''}
      
      <div class="footer">
        <p>Generated by SEOMax - ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>
  `;
} 