import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateStageCandidate as check, STAGE_QUARANTINED_ACTIONS } from '../lib/erp/stage-isolation-policy.ts'
const home = '/app/urisa-erp-sso-stage/home-6aca7db6ca8e986ee7957afe'
const ops = '/app/urisa-erp-sso-stage/operations-6aca842aca8e986ee7958031'
const all = [{appsmith_page:'Operations',can_view:true}]
const other = [{appsmith_page:'AnotherPage',can_view:true}]
const read = target => ({method:'GET',target})
const action = actionId => ({method:'POST',target:'/api/v1/actions/execute',actionId,viewMode:true})
const cases = [
 ['absent session',read(home),null,false,'SESSION_OR_GRANTS_INVALID'],
 ['revoked or no grants',read(home),[],false,'SESSION_OR_GRANTS_INVALID'],
 ['Home with active grant',read(home),other,true,'PERIMETER_NOT_CERTIFIED'],
 ['Operations permission',read(ops),all,true,'PERIMETER_NOT_CERTIFIED'],
 ['Operations without permission',read(ops),other,false,'PAGE_DENIED'],
 ['forged page slug',read(home.replace('home-','operations-')),all,false,'PAGE_SLUG_MISMATCH'],
 ['editor URL',read(home+'/edit'),all,false,'RESOURCE_NOT_IN_STAGE'],
 ['unknown API',read('/api/v1/datasources'),all,false,'RESOURCE_NOT_IN_STAGE'],
 ['alternate host',read('https://dashboard.urisacompresores.com'+home),all,false,'NON_CANONICAL_TARGET'],
 ['encoded path',read(home+'%2fedit'),all,false,'NON_CANONICAL_TARGET'],
 ['email authority',read(home+'?email=forged'),all,false,'UNSUPPORTED_PARAMETER'],
 ['token authority',read(home+'?erp_token=forged'),all,false,'UNSUPPORTED_PARAMETER'],
 ['canonical consolidated',read('/api/v1/consolidated-api/view?defaultPageId=6aca7db6ca8e986ee7957afe'),all,true,'RESPONSE_FILTER_REQUIRED'],
 ['duplicate page',read('/api/v1/consolidated-api/view?defaultPageId=6aca7db6ca8e986ee7957afe&defaultPageId=6aca842aca8e986ee7958031'),all,false,'DUPLICATE_PARAMETER'],
 ['different branch',read('/api/v1/consolidated-api/view?defaultPageId=6aca7db6ca8e986ee7957afe&branchName=other'),all,false,'UNSUPPORTED_BRANCH'],
 ['unregistered page',read('/api/v1/consolidated-api/view?defaultPageId=000000000000000000000000'),all,false,'RESOURCE_NOT_IN_STAGE'],
 ['Home permission action',action('6aca8e6fca8e986ee7958050'),all,true,'SERVER_SESSION_ADAPTER_REQUIRED'],
 ['Operations permission action denied',action('6aca8e6fca8e986ee7958062'),other,false,'PAGE_DENIED'],
 ['unknown action',action('000000000000000000000000'),all,false,'RESOURCE_NOT_IN_STAGE'],
 ['prototype action',action('toString'),all,false,'RESOURCE_NOT_IN_STAGE'],
 ['edit execution',{...action('6aca8e6fca8e986ee7958050'),viewMode:false},all,false,'EDITOR_MODE_FORBIDDEN'],
 ...STAGE_QUARANTINED_ACTIONS.map(id => ['quarantined '+id,action(id),all,false,'ACTION_QUARANTINED']),
]
for (const [name,request,grants,permission,reason] of cases) test(name,()=>{
 const result=check(request,grants)
 assert.equal(result.resource_permission,permission)
 assert.equal(result.reason,reason)
 assert.equal(result.execution_allowed,false)
 assert.equal(result.diagnostic_only,true)
})
