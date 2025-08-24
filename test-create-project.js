#!/usr/bin/env node
import { ProjectManager } from './lib/project-manager.js';
import { SiteGroundManager } from './lib/siteground-manager.js';

async function test() {
  console.log('🚀 Creating WordPress project for tylerhorn.com...\n');
  
  const projectManager = new ProjectManager();
  const sitegroundManager = new SiteGroundManager();
  
  try {
    // Step 1: Create the project
    console.log('Step 1: Creating local WordPress project...');
    const result = await projectManager.createProject('tylerhorn', 8085);
    console.log('✅ Project created successfully!\n');
    console.log('Project details:', result.content[0].text);
    
    // Step 2: Connect to SiteGround
    console.log('\nStep 2: Connecting to SiteGround Git repository...');
    const connectResult = await sitegroundManager.connectProject(
      'tylerhorn',
      'gvam1275.siteground.biz',
      'u1836-0gj8kch3wtnk',
      'home/customer/www/tylerhorn.com/public_html',
      'https://tylerhorn.com'
    );
    console.log('✅ Connected to SiteGround!\n');
    console.log(connectResult.content[0].text);
    
    // Step 3: Show project info
    console.log('\nStep 3: Project Information:');
    const info = await sitegroundManager.getDeploymentInfo('tylerhorn');
    console.log(info.content[0].text);
    
    console.log('\n🎉 Project setup complete!');
    console.log('📝 Next steps:');
    console.log('1. Access local WordPress at: http://localhost:8085');
    console.log('2. Complete WordPress installation in browser');
    console.log('3. Make your changes locally');
    console.log('4. Deploy to SiteGround using: wp_siteground_deploy("tylerhorn")');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

test();