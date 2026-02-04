export interface Metadata {
    url?: string;
    hostname?: string;
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    favicon?: string;
}

export interface AuditIssue {
    priority: 'high' | 'medium' | 'low';
    message: string;
}

export interface InspectionResult {
    metadata: Metadata;
    score: number;
    issues: AuditIssue[];
    stats?: {
        totalScans: number;
        percentile: number;
    };
    siteId?: string;
}

export interface AISuggestion {
    title: string;
    description: string;
}

export interface GeoIssue {
    id?: string;
    page_url: string;
    category: string;
    code: string;
    severity: string;
    title: string;
    description: string;
    fix_type: string;
    fix_payload: { type: string; title: string; explanation: string; output: string };
}

export interface GeoScanResult {
    scanId: string;
    overall_score: number;
    crawl_score: number;
    structure_score: number;
    entity_score: number;
    schema_score: number;
    reference_score: number;
    issuesCount: number;
    issues: GeoIssue[];
    pages?: Array<{ url: string; page_score: number; issues_count: number }>;
}
