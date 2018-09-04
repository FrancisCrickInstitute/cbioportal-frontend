let parentProjectFrontendConfig:any = (window as any).frontendConfig;
let frontendConfig:any = {};

// Check whether to use parentProjectFrontendConfig coming from JSP in
// cbioportal/cbioportal, else use the development config
if (parentProjectFrontendConfig) {
    frontendConfig = parentProjectFrontendConfig;
} else {
    frontendConfig = {
        // uncomment to enable Darwin internal MSKCC service patient view link
        // uses checkDarwinAccess.do service from cbioportal/cbioportal
        // enableDarwin : true,
        // @ts-ignore: ENV_* are defined in webpack.config.js
        apiRoot : ENV_CBIOPORTAL_URL,
        // @ts-ignore: ENV_* are defined in webpack.config.js
        genomeNexusApiUrl : ENV_GENOME_NEXUS_URL,
        showCivic : true,
        showHotspot : true,
        showMyCancerGenome : true,
        showOncoKB : true,
        oncoKBApiUrl : "oncokb.org/api/v1",
        showGenomeNexus : true,
        skinBlurb : 'The TRACERx cBioPortal for Cancer Genomics provides <b>visualization</b>, <b>analysis</b> and <b>download</b> of large-scale cancer genomics data sets. <p><b>Please cite</b> <a href="https://www.nejm.org/doi/10.1056/NEJMoa1616288">Jamal-Hanjani et al. <i>NEJM</i> 2017</a> when publishing results based on TRACERx cBioPortal.</p>',
        skinExampleStudyQueries : [
            'tcga',
            'tcga -provisional',
            'tcga -moratorium',
            'tcga OR icgc',
            '-"cell line"',
            'prostate mskcc',
            'esophageal OR stomach',
            'serous',
            'breast',
        ],
        skinDatasetHeader : 'The portal currently contains data from the following cancer genomics studies.  The table below lists the number of available samples per data type and tumor.',
        skinDatasetFooter : 'Data sets of TCGA studies were downloaded from Broad Firehose (http://gdac.broadinstitute.org) and updated monthly. In some studies, data sets were from the TCGA working groups directly.',
        skinRightNavShowDatasets : true,
        skinRightNavShowExamples : true,
        skinRightNavShowTestimonials : true,
        //labels to be displayed in oncoprint "Mutation color" menu for custom annotation of driver and passenger mutations in the oncoprint.
        // Set any of these properties to enable the respective menu options in oncoprint:
        oncoprintCustomDriverAnnotationBinaryMenuLabel: "Custom driver annotation",
        oncoprintCustomDriverAnnotationTiersMenuLabel: "Custom driver tiers",
        // set this to false to disable the automatic selection of the custom driver/passenger mutations annotation (binary) in the oncoprint when custom annotation data is present
        oncoprintCustomDriverAnnotationDefault: false,
        // set this to false to disable the automatic selection of the custom tiers in the oncoprint when custom annotation data is present. By default this property is true.
        oncoprintCustomDriverTiersAnnotationDefault: false,
    };
}

// Override frontendConfig with localStorage frontendConfig if available
let localStorageFrontendConfig:any = {};
if (localStorage.frontendConfig) {
    try {
        localStorageFrontendConfig = JSON.parse(localStorage.frontendConfig);
        console.log("Using localStorage.frontendConfig (overriding window.frontendConfig): " + localStorage.frontendConfig);
    } catch (err) {
        // ignore
        console.log("Error parsing localStorage.frontendConfig")
    }
}
const config:any = Object.assign(frontendConfig, localStorageFrontendConfig);
export default config;
