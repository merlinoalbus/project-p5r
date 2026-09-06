"""Reviewed path specifications; native state is not silently mapped to app state."""
from scrittura import scrivi_json
import json,sys
from pathlib import Path
from extract_maps import sha
from world_connections import procedures

SPECS={
 'CHK_CONVENIENCE':{'path':'B0[96]!=1 AND B0[1008]!=1 AND (B0[1039]!=1 OR (COUNT[66]>=1 AND B1[1205]!=1))','interaction':[],'classification':'field-transfer','effects':['B0[749]=1 when first shortcut discovery']},
 'CHK_GALAXY':{'path':'B0[96]!=1 AND B0[1039]!=1 AND B0[1008]!=1','interaction':[],'classification':'field-transfer','effects':['B0[747]=1 when first shortcut discovery']},
 'MAIN_TRAINING_GIM':{'path':'B0[96]!=1 AND B0[1039]==1 AND truthy(B1[87])','interaction':[],'classification':'narrative-field-transfer',
   'ordinaryActivity':{'path':'B0[96]!=1 AND B0[1039]!=1 AND B0[1008]!=1 AND B0[2116]!=1 AND B1[1248]!=0','interaction':['SEL(SEL_GimShopEnter_Q)==0','moneySnapshot>=2000'],
     'event':[762,701],'effects':['money-=2000','B1[1065]=1','network action85 uses GET_TIME3/4 or5','CHK_DAYS_STARTEND(4,1,4,2)==1: CALL_FIELD(1,3,0,0); otherwise CALL_CALENDAR']},'effects':[]},
 'Main_DartsAndBilliard':{'path':'B0[96]!=1 AND B0[1039]!=1 AND B0[2116]!=1 AND B0[1008]!=1','interaction':[],'classification':'field-transfer','effects':['B0[742]=1 when first shortcut discovery']},
 'Main_JazzClub':{'path':'B0[96]!=1 AND B0[1039]!=1 AND B0[2116]!=1 AND B0[1008]!=1 AND CMM_GET_LV(9)>3 AND GET_TIME()==5',
   'interaction':['Current loop choice SEL(SEL_Jazzclub_UseThink)==0','ADD_PC_MONEY(0)>=3000','SUB_InviteMember completes with COUNT[320]!=10'],
   'classification':'activity-field-transfer','effects':['B0[1002..1007] cleared before guards','cocktail/singer helpers execute before selection','B1[2071] and B1[2072] tutorial flags may be written','B1[2089] set if singer day','B1[2062] set when procedure reaches its tail, including GET_TIME()!=5 without entering; not proof of visit or activity; no payment deduction asserted in this procedure']},
 'CHK_BATTING_CENTER':{'path':'B0[96]!=1 AND B0[1039]!=1 AND B0[2116]!=1 AND B0[1008]!=1 AND B1[1099]!=0 AND CHK_DAYS(4,17)!=1',
   'interaction':['B1[1243]!=0 OR SEL(SEL_BAT_START_1ST_MORU)!=1'],'classification':'field-transfer','effects':['B0[756]=1 on first shortcut','B1[1243]=1 before transfer']}
}

def main(out):
    out=Path(out);root=out/'proiezione-urbana';raw=(root/'evidenze.json').read_bytes();d=json.loads(raw);fields={f['field']:f for f in d['fields']};cases=[]
    for c in d['cases']:
        f=fields[c['sourceField']];proc=next(p for p in f['procedures'] if p['index']==c['procedureIndex']);spec=SPECS[proc['name']]
        cases.append({'occurrence':c,'specification':spec,'procedure':proc,'allLocalProcedures':f['procedures'],'appCondition':None,
          'htbGuards':[{'trigger':t['index'],'enable':t['enableFlags'],'disable':t['disableFlags']} for t in c['triggerRoots']]})
    assert len(cases)==len(SPECS)
    scheduler=[]
    for month,index,flag,operation in [(1,22,1008,'BIT_ON'),(1,76,1008,'BIT_OFF'),(3,134,1039,'BIT_ON')]:
        path=f'scheduler/BASE/SCHEDULER_{month:02d}.flow';b=(out/path).read_bytes();p=procedures(b.decode('utf-8-sig'))[index]
        assert f'{operation}((0 + {flag}))' in p['body']
        scheduler.append({'file':path,'sha256':sha(b),'procedure':p,'bank':0,'index':flag,'operation':operation,'calendarInterpretation':None})
    result={'schemaVersion':1,'sourceSha256':sha(raw),'schedulerReferences':scheduler,'notation':{'B0':'bank0 raw address=index','B1':'bank0x10000000 raw address=0x10000000+index','truthy':'nonzero; not assumed equal1'},
      'cases':cases,'limits':['Path expressions describe the selected CALL_FIELD only, not every possible navigation from the interaction.','HTB guard semantics remain separate and unevaluated.','Native conditions are not app conditions; no date inferred from procedure names.','Local procedure bodies retain other narrative/event branches and loops.']}
    scrivi_json(root/'condizioni.json', result);print('6 native path specifications saved')

if __name__=='__main__':main(sys.argv[1])

