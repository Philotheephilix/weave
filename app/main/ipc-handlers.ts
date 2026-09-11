import { ipcMain, app, safeStorage, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { randomBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { secp256k1 } from '@noble/curves/secp256k1'
import { x25519 } from '@noble/curves/ed25519'
import { createWalletClient, createPublicClient, http, parseAbiItem, decodeEventLog } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { TorManager } from './tor-manager.js'
import { DHTDiscovery } from './dht-discovery.js'
import { NostrDelivery } from './nostr-delivery.js'
import { getPublicKey } from 'nostr-tools'
import { npubEncode } from 'nostr-tools/nip19'
import { IdentityManager, createIdentity, WeaveIdentity } from './identity-manager.js'
import { computeStealthAddress } from './crypto/stealth-address.js'
import { ADDRESSES, SEPOLIA_RPC } from './addresses.js'
import { ArkivManager, deriveChannelKey } from './arkiv-manager.js'

const ARKIV_ENABLED = process.env.WEAVE_ARKIV_ENABLED === 'true'

const BIP39_WORDS = ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act','action','actor','actress','actual','adapt','add','addict','address','adjust','admit','adult','advance','advice','aerobic','afford','afraid','again','age','agent','agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert','alien','all','alley','allow','almost','alone','alpha','already','also','alter','always','amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger','angle','angry','animal','ankle','announce','annual','another','answer','antenna','antique','anxiety','any','apart','apology','appear','apple','approve','april','arcade','arctic','area','arena','argue','arm','armed','armor','army','around','arrange','arrest','arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset','assist','assume','asthma','athlete','atom','attack','attend','attitude','attract','auction','audit','august','aunt','author','auto','autumn','average','avocado','avoid','awake','aware','away','awesome','awful','awkward','axis','baby','balance','bamboo','banana','banner','bar','barely','bargain','barrel','base','basic','basket','battle','beach','bean','beauty','because','become','beef','before','begin','behave','behind','believe','below','belt','bench','benefit','best','betray','better','between','beyond','bicycle','bid','bike','bind','biology','bird','birth','bitter','black','blade','blame','blanket','blast','bleak','bless','blind','blood','blossom','blouse','blue','blur','blush','board','boat','body','boil','bomb','bone','book','boost','border','boring','borrow','boss','bottom','bounce','box','boy','bracket','brain','brand','brave','breeze','brick','bridge','brief','bright','bring','brisk','broccoli','broken','bronze','broom','brother','brown','brush','bubble','buddy','budget','buffalo','build','bulb','bulk','bullet','bundle','bunker','burden','burger','burst','bus','business','busy','butter','buyer','buzz','cabbage','cabin','cable','cactus','cage','cake','call','calm','camera','camp','can','canal','cancel','candy','cannon','canvas','canyon','capable','capital','captain','car','carbon','card','cargo','carpet','carry','cart','case','cash','casino','castle','casual','cat','catalog','catch','category','cattle','caught','cause','caution','cave','ceiling','celery','cement','census','century','cereal','certain','chair','chalk','champion','change','chaos','chapter','charge','chase','chat','cheap','check','cheese','chef','cherry','chest','chicken','chief','child','chimney','choice','choose','chronic','chuckle','chunk','churn','cigar','cinnamon','circle','citizen','city','civil','claim','clap','clarify','claw','clay','clean','clerk','clever','click','client','cliff','climb','clinic','clip','clock','clog','close','cloth','cloud','clown','club','clump','cluster','clutch','coach','coast','coconut','code','coffee','coil','coin','collect','color','column','combine','come','comfort','comic','common','company','concert','conduct','confirm','congress','connect','consider','control','convince','cook','cool','copper','copy','coral','core','corn','correct','cost','cotton','couch','country','couple','course','cousin','cover','coyote','crack','cradle','craft','cram','crane','crash','crater','crawl','crazy','cream','credit','creek','crew','cricket','crime','crisp','critic','cross','crouch','crowd','crucial','cruel','cruise','crumble','crunch','crush','cry','crystal','cube','culture','cup','cupboard','curious','current','curtain','curve','cushion','custom','cute','cycle','dad','damage','damp','dance','danger','daring','dash','daughter','dawn','day','deal','debate','debris','decade','december','decide','decline','decorate','decrease','deer','defense','define','defy','degree','delay','deliver','demand','demise','denial','dentist','deny','depart','depend','deposit','depth','deputy','derive','describe','desert','design','desk','despair','destroy','detail','detect','develop','device','devote','diagram','dial','diamond','diary','dice','diesel','diet','differ','digital','dignity','dilemma','dinner','dinosaur','direct','dirt','disagree','discover','disease','dish','dismiss','disorder','display','distance','divert','divide','divorce','dizzy','doctor','document','dog','doll','dolphin','domain','donate','donkey','donor','door','dose','double','dove','draft','dragon','drama','drastic','draw','dream','dress','drift','drill','drink','drip','drive','drop','drum','dry','duck','dumb','dune','during','dust','dutch','duty','dwarf','dynamic','eager','eagle','early','earn','earth','easily','east','easy','echo','ecology','edge','edit','educate','effort','egg','eight','either','elbow','elder','electric','elegant','element','elephant','elevator','elite','else','embark','embody','embrace','emerge','emotion','employ','empower','empty','enable','enact','endless','endorse','enemy','energy','enforce','engage','engine','enhance','enjoy','enlist','enough','enrich','enroll','ensure','enter','entire','entry','envelope','episode','equal','equip','erase','erode','erosion','error','erupt','escape','essay','essence','estate','eternal','ethics','evidence','evil','evoke','evolve','exact','example','excess','exchange','excite','exclude','exercise','exhaust','exhibit','exile','exist','exit','exotic','expand','expire','explain','expose','express','extend','extra','eye','fable','face','faculty','faint','faith','fall','false','fame','family','famous','fan','fancy','fantasy','far','fashion','fat','fatal','father','fatigue','fault','favorite','feature','february','federal','fee','feed','feel','feet','fellow','felt','fence','festival','fetch','fever','few','fiber','fiction','field','figure','file','film','filter','final','find','fine','finger','finish','fire','firm','first','fiscal','fish','fit','fitness','fix','flag','flame','flash','flat','flavor','flee','flight','flip','float','flock','floor','flower','fluid','flush','fly','foam','focus','fog','foil','follow','food','foot','force','forest','forget','fork','fortune','forum','forward','fossil','foster','found','fox','fragile','frame','frequent','fresh','friend','fringe','frog','front','frost','frown','frozen','fruit','fuel','fun','funny','furnace','fury','future','gadget','gain','galaxy','gallery','game','gap','garbage','garden','garlic','garment','gas','gasp','gate','gather','gauge','gaze','general','genius','genre','gentle','genuine','gesture','ghost','giant','gift','giggle','ginger','giraffe','girl','give','glad','glance','glare','glass','glide','glimpse','globe','gloom','glory','glove','glow','glue','goat','goddess','gold','good','goose','gorilla','gospel','gossip','govern','gown','grab','grace','grain','grant','grape','grasp','grass','gravity','great','green','grid','grief','grit','grocery','group','grow','grunt','guard','guide','guilt','guitar','gun','gym','habit','hair','half','hammer','hamster','hand','happy','harsh','harvest','hat','have','hawk','hazard','head','health','heart','heavy','hedgehog','height','hello','helmet','help','hero','hidden','high','hill','hint','hip','hire','history','hobby','hockey','hold','hole','holiday','hollow','home','honey','hood','hope','horn','hospital','host','hour','hover','hub','huge','human','humble','humor','hundred','hungry','hunt','hurdle','hurry','hurt','husband','hybrid','ice','icon','ignore','ill','illegal','image','imitate','immense','immune','impact','impose','improve','impulse','inbox','income','index','indicate','indoor','industry','infant','inflict','inform','inhale','inject','inner','innocent','input','inquiry','insane','insect','inside','inspire','install','intact','interest','into','invest','invite','involve','iron','island','isolate','issue','item','ivory','jacket','jaguar','jar','jazz','jealous','jeans','jelly','jewel','job','join','joke','journey','joy','judge','juice','jump','jungle','junior','junk','just','kangaroo','keen','keep','ketchup','key','kick','kid','kingdom','kiss','kit','kitchen','kite','kitten','kiwi','knee','knife','knock','know','lab','ladder','lady','lake','lamp','language','laptop','large','later','laugh','laundry','lava','lawn','lawsuit','layer','lazy','leader','learn','leave','lecture','left','leg','legal','legend','leisure','lemon','lend','length','lens','leopard','lesson','letter','level','liar','liberty','library','license','life','lift','like','limb','lion','liquid','list','little','live','lizard','load','loan','lobster','local','lock','logic','lonely','long','loop','lottery','loud','lounge','love','loyal','lucky','luggage','lumber','lunar','lunch','luxury','mad','magic','magnet','maid','main','mammoth','manage','mandate','mango','mansion','manual','maple','marble','march','margin','marine','market','marriage','mask','master','match','material','math','matter','maximum','maze','meadow','mean','medal','media','melody','melt','member','memory','mention','menu','mercy','mesh','message','metal','method','middle','midnight','milk','minute','miracle','miss','mitten','model','modify','mom','monitor','monkey','monster','month','moon','moral','more','morning','mosquito','mother','motion','motor','mountain','mouse','move','movie','much','muffin','mule','multiply','muscle','museum','mushroom','music','must','mutual','myself','mystery','naive','name','napkin','narrow','nasty','nature','near','neck','need','negative','neglect','neither','nephew','nerve','nest','network','news','next','nice','night','noble','noise','nominee','noodle','normal','north','notable','note','nothing','notice','novel','now','nuclear','number','nurse','nut','oak','obey','object','oblige','obscure','obtain','ocean','october','odor','offer','office','often','oil','okay','old','olive','olympic','omit','once','onion','open','option','orange','orbit','orchard','order','ordinary','organ','orient','original','orphan','ostrich','other','outdoor','outside','oval','over','own','oyster','ozone','pact','paddle','page','pair','palace','palm','panda','panel','panic','panther','paper','parade','parent','park','parrot','party','pass','patch','path','patrol','pause','pave','payment','peace','peanut','peasant','pelican','pen','penalty','pencil','people','pepper','perfect','permit','person','pet','phone','photo','phrase','physical','piano','picnic','picture','piece','pig','pigeon','pill','pilot','pink','pioneer','pipe','pistol','pitch','pizza','place','planet','plastic','plate','play','please','pledge','pluck','plug','plunge','poem','poet','point','polar','pole','police','pond','pony','pool','popular','portion','position','possible','post','potato','pottery','poverty','powder','power','practice','praise','predict','prefer','prepare','present','pretty','prevent','price','pride','primary','print','priority','prison','private','prize','problem','process','produce','profit','program','project','promote','proof','property','prosper','protect','proud','provide','public','pudding','pull','pulp','pulse','pumpkin','punish','pupil','purchase','purity','purpose','push','put','puzzle','pyramid','quality','quantum','quarter','question','quick','quit','quiz','quote','rabbit','raccoon','race','rack','radar','radio','rage','rail','rain','raise','rally','ramp','ranch','random','range','rapid','rare','rate','rather','raven','reach','ready','real','reason','rebel','rebuild','recall','receive','recipe','record','recycle','reduce','reflect','reform','refuse','region','regret','regular','reject','relax','release','relief','rely','remain','remember','remind','remove','render','renew','rent','reopen','repair','repeat','replace','report','require','rescue','resemble','resist','resource','response','result','retire','retreat','return','reunion','reveal','review','reward','rhythm','ribbon','rid','ride','ridge','rifle','right','rigid','ring','riot','ripple','risk','ritual','rival','river','road','roast','robot','robust','rocket','romance','roof','rookie','room','rose','rotate','rough','royal','rubber','rude','rug','rule','run','runway','rural','sad','saddle','sadness','safe','sail','salad','salmon','salon','salt','salute','same','sample','sand','satisfy','satoshi','sauce','sausage','save','say','scale','scan','scatter','scene','scheme','school','science','scissors','scorpion','scout','scrap','screen','script','scrub','sea','search','season','seat','second','secret','section','security','seek','segment','select','sell','seminar','senior','sense','sentence','series','service','session','settle','setup','seven','shadow','shaft','shallow','share','shed','shell','sheriff','shield','shift','shine','ship','shiver','shock','shoot','short','shoulder','shove','shrimp','shrug','shuffle','shy','sibling','siege','sight','sign','silent','silk','silly','silver','similar','simple','since','sing','siren','sister','situate','six','size','sketch','skill','skin','skirt','skull','slab','slam','sleep','slender','slice','slide','slight','slim','slogan','slot','slow','slush','small','smart','smile','smoke','smooth','snack','snake','snap','sniff','snow','soap','soccer','social','sock','solar','soldier','solid','solution','solve','someone','song','soon','sorry','soul','sound','soup','source','south','space','spare','spatial','spawn','speak','special','speed','sphere','spice','spider','spike','spin','spirit','split','spoil','sponsor','spoon','spray','spread','spring','spy','square','squeeze','squirrel','stable','stadium','staff','stage','stairs','stamp','stand','start','state','stay','steak','steel','stem','step','stereo','stick','still','sting','stock','stomach','stone','stop','store','storm','story','stove','strategy','street','strike','strong','struggle','student','stuff','stumble','subject','submit','subway','success','such','sudden','suffer','sugar','suggest','suit','summer','sun','sunny','sunset','super','supply','supreme','sure','surface','surge','surprise','sustain','swallow','swamp','swap','swear','sweet','swift','swim','swing','switch','sword','symbol','symptom','syrup','table','tackle','tag','tail','talent','tank','tape','target','task','tattoo','taxi','teach','team','tell','ten','tenant','tennis','tent','term','test','text','thank','that','theme','then','theory','there','they','thing','this','thought','three','thrive','throw','thumb','thunder','ticket','tilt','timber','time','tiny','tip','tired','title','toast','tobacco','today','together','toilet','token','tomato','tomorrow','tone','tongue','tonight','tool','topic','topple','torch','tornado','tortoise','toss','total','tourist','toward','tower','town','toy','track','trade','traffic','tragic','train','transfer','trap','trash','travel','tray','treat','tree','trend','trial','tribe','trick','trigger','trim','trip','trophy','trouble','truck','truly','trumpet','trust','truth','try','tube','tuition','tumble','tuna','tunnel','turkey','turn','turtle','twelve','twenty','twice','twin','twist','two','type','typical','ugly','umbrella','unable','uniform','unique','universe','unknown','unlock','until','unusual','unveil','update','upgrade','uphold','upon','upper','upset','urban','useful','useless','usual','utility','vacant','vacuum','vague','valid','valley','valve','van','vanish','vapor','various','vast','vault','vehicle','velvet','vendor','venture','venue','verb','verify','version','very','vessel','veteran','viable','vibrant','vicious','victory','video','view','village','vintage','violin','virtual','virus','visa','visit','visual','vital','vivid','vocal','voice','void','volcano','volume','vote','voyage','wage','wagon','wait','walk','wall','walnut','want','warfare','warm','warrior','waste','water','wave','way','wealth','weapon','wear','weasel','wedding','weekend','weird','welcome','west','wet','whale','wheat','wheel','when','where','whip','whisper','wide','width','wife','wild','will','win','window','wine','wing','wink','winner','winter','wire','wisdom','wise','wish','witness','wolf','woman','wonder','wood','wool','word','world','worry','worth','wrap','wreck','wrestle','wrist','write','wrong','yard','year','yellow','you','young','youth','zebra','zero','zone','zoo']

// Derive deterministic WeaveIdentity + secp256k1 wallet key from BIP39 seed phrase.
// Uses sha256 chains for simplicity (no BIP32 — keeps noble/hashes as only dep).
function deriveKeysFromSeed(words: string[]): {
  identity: WeaveIdentity
  ethPrivKey: `0x${string}`
  ethAddress: `0x${string}`
} {
  const seed = new TextEncoder().encode(words.join(' '))
  const h0 = sha256(seed)
  const h1 = sha256(h0)
  const h2 = sha256(h1)
  const h3 = sha256(h2)
  // Ensure private keys are valid secp256k1 scalars (must be < curve order)
  const viewPriv  = secp256k1.utils.normPrivateKeyToScalar(h0)
  const spendPriv = secp256k1.utils.normPrivateKeyToScalar(h1)
  // Use h2 for Ethereum wallet key (secp256k1)
  const ethPrivScalar = secp256k1.utils.normPrivateKeyToScalar(h2)
  const ethPrivBuf = Buffer.from(ethPrivScalar.toString(16).padStart(64, '0'), 'hex')
  const ethPrivKey = `0x${ethPrivBuf.toString('hex')}` as `0x${string}`
  const viewPrivBuf  = Buffer.from(viewPriv.toString(16).padStart(64, '0'), 'hex')
  const spendPrivBuf = Buffer.from(spendPriv.toString(16).padStart(64, '0'), 'hex')
  const identity: WeaveIdentity = {
    viewPriv:  viewPrivBuf,
    viewPub:   secp256k1.getPublicKey(viewPrivBuf, true),
    spendPriv: spendPrivBuf,
    spendPub:  secp256k1.getPublicKey(spendPrivBuf, true),
    noisePriv: h3,
    noisePub:  x25519.getPublicKey(h3),
  }
  const account = privateKeyToAccount(ethPrivKey)
  return { identity, ethPrivKey, ethAddress: account.address as `0x${string}` }
}

const REGISTRAR_ABI = [
  {
    name: 'registerOrg',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orgLabel', type: 'string' },
      { name: 'adminAddr', type: 'address' },
      {
        name: 'adminIdentity',
        type: 'tuple',
        components: [
          { name: 'stealthViewKey',  type: 'bytes' },
          { name: 'stealthSpendKey', type: 'bytes' },
          { name: 'x25519Pubkey',    type: 'bytes' },
          { name: 'onionAddress',    type: 'bytes' },
          { name: 'nostrPubkey',     type: 'bytes' },
          { name: 'registeredAt',    type: 'uint64' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'enrollMember',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orgLabel',    type: 'string' },
      { name: 'memberLabel', type: 'string' },
      { name: 'memberAddr',  type: 'address' },
      {
        name: 'memberIdentity',
        type: 'tuple',
        components: [
          { name: 'stealthViewKey',  type: 'bytes' },
          { name: 'stealthSpendKey', type: 'bytes' },
          { name: 'x25519Pubkey',    type: 'bytes' },
          { name: 'onionAddress',    type: 'bytes' },
          { name: 'nostrPubkey',     type: 'bytes' },
          { name: 'registeredAt',    type: 'uint64' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'orgAdmins',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

function generateSeedPhrase(): string[] {
  const bytes = randomBytes(16) // 128 bits of entropy
  const n = BigInt('0x' + Buffer.from(bytes).toString('hex'))
  return Array.from({ length: 12 }, (_, i) => {
    const shift = BigInt(128 - 11 * (i + 1))
    return BIP39_WORDS[Number((n >> shift) & 0x7FFn)]
  })
}

const IDENTITY_PATH = () => path.join(app.getPath('userData'), 'weave-identity.json')
const SEED_PATH = () => path.join(app.getPath('userData'), 'weave-seed.bin')
const MEMBERS_PATH = (orgName: string) => path.join(app.getPath('userData'), `weave-members-${orgName}.json`)
const TEAMS_PATH = (orgName: string) => path.join(app.getPath('userData'), `weave-teams-${orgName}.json`)
const DM_ORDER_PATH = (orgName: string) => path.join(app.getPath('userData'), `weave-dmorder-${orgName}.json`)

interface StoredTeam {
  id: string
  name: string
  initials: string
  tint: string
  ink: string
  members: number
  channels: Array<{ id: string; name: string; kind: string; unread: number; desc: string }>
}

function loadTeams(orgName: string): StoredTeam[] {
  try {
    const p = TEAMS_PATH(orgName)
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {}
  return []
}

function saveTeams(orgName: string, teams: StoredTeam[]) {
  try { fs.writeFileSync(TEAMS_PATH(orgName), JSON.stringify(teams, null, 2)) } catch {}
}

function loadDMOrder(orgName: string): string[] {
  try {
    const p = DM_ORDER_PATH(orgName)
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {}
  return []
}

function saveDMOrder(orgName: string, order: string[]) {
  try { fs.writeFileSync(DM_ORDER_PATH(orgName), JSON.stringify(order)) } catch {}
}

// WeaveRegistrar deployment block on Sepolia — safe start point for log scanning.
// Contract deployed recently; 8_600_000 is a conservative lower bound that avoids
// scanning the entire chain history while still catching all Registered events.
const REGISTRAR_DEPLOY_BLOCK = 8_600_000n

const REGISTERED_EVENT = parseAbiItem(
  'event Registered(string label, address indexed owner, string tier)'
)

interface MemberCache {
  members: Array<{ name: string; address: string }>
  lastScannedBlock: number
}

function loadMemberCache(orgName: string): MemberCache {
  try {
    const raw = fs.readFileSync(MEMBERS_PATH(orgName), 'utf8')
    const parsed = JSON.parse(raw)
    // Support old format (plain array) and new format (object with members + lastScannedBlock)
    if (Array.isArray(parsed)) {
      return { members: parsed, lastScannedBlock: Number(REGISTRAR_DEPLOY_BLOCK) - 1 }
    }
    return parsed as MemberCache
  } catch {
    return { members: [], lastScannedBlock: Number(REGISTRAR_DEPLOY_BLOCK) - 1 }
  }
}

function saveMemberCache(orgName: string, cache: MemberCache) {
  try { fs.writeFileSync(MEMBERS_PATH(orgName), JSON.stringify(cache, null, 2)) } catch {}
}

// Legacy helpers kept for enroll-member handler which adds directly to cache.
function loadLocalMembers(orgName: string): Array<{ name: string; address: string }> {
  return loadMemberCache(orgName).members
}

function saveLocalMembers(orgName: string, members: Array<{ name: string; address: string }>) {
  const cache = loadMemberCache(orgName)
  saveMemberCache(orgName, { ...cache, members })
}

async function fetchMembersFromChain(orgName: string): Promise<Array<{ name: string; address: string }>> {
  const cache = loadMemberCache(orgName)
  const pubClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })

  const currentBlock = await pubClient.getBlockNumber()
  const fromBlock = BigInt(cache.lastScannedBlock + 1)

  if (fromBlock > currentBlock) {
    return cache.members
  }

  const BATCH = 10n
  let block = fromBlock
  const newMembers: Array<{ name: string; address: string }> = []
  const seenAddresses = new Set(cache.members.map(m => m.address.toLowerCase()))

  while (block <= currentBlock) {
    const toBlock = block + BATCH - 1n < currentBlock ? block + BATCH - 1n : currentBlock
    try {
      const logs = await pubClient.getLogs({
        address: ADDRESSES.WeaveRegistrar,
        event: REGISTERED_EVENT,
        fromBlock: block,
        toBlock,
      })

      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: [REGISTERED_EVENT],
            data: log.data,
            topics: log.topics,
          })
          const args = decoded.args as { label: string; owner: `0x${string}`; tier: string }
          if (
            args.tier === 'member' &&
            args.label.endsWith(`.${orgName}`)
          ) {
            const addr = args.owner.toLowerCase()
            if (!seenAddresses.has(addr)) {
              seenAddresses.add(addr)
              newMembers.push({
                name: `${args.label}.weave.eth`,
                address: addr,
              })
            }
          }
        } catch {
          // skip malformed log
        }
      }
    } catch {
      // skip batch on RPC error — do not advance block cursor so next call retries
      break
    }
    block = toBlock + 1n
  }

  const updatedMembers = [...cache.members, ...newMembers]
  saveMemberCache(orgName, {
    members: updatedMembers,
    lastScannedBlock: Number(currentBlock),
  })

  return updatedMembers
}

function saveIdentity(data: Record<string, unknown>): void {
  // Separate the seed phrase — store it encrypted in Keychain via safeStorage
  const { seedPhrase, ...rest } = data
  if (seedPhrase && safeStorage.isEncryptionAvailable()) {
    const enc = safeStorage.encryptString((seedPhrase as string[]).join(' '))
    fs.writeFileSync(SEED_PATH(), enc)
  }
  fs.writeFileSync(IDENTITY_PATH(), JSON.stringify(rest, null, 2))
}

function loadIdentity(): Record<string, unknown> | null {
  const fpath = IDENTITY_PATH()
  if (!fs.existsSync(fpath)) return null
  const meta = JSON.parse(fs.readFileSync(fpath, 'utf8')) as Record<string, unknown>
  // Re-attach seed phrase from Keychain if available
  const seedPath = SEED_PATH()
  if (fs.existsSync(seedPath) && safeStorage.isEncryptionAvailable()) {
    try {
      const decrypted = safeStorage.decryptString(fs.readFileSync(seedPath))
      meta.seedPhrase = decrypted.split(' ')
    } catch {
      // Keychain denied or corrupt — seed not available
    }
  }
  return meta
}

export function registerIpcHandlers(
  tor: TorManager,
  dht: DHTDiscovery,
  nostr: NostrDelivery,
  idMgr: IdentityManager,
  identity: WeaveIdentity,
  win: BrowserWindow,
  arkiv?: ArkivManager,
): void {

  ipcMain.handle('weave:identity:get', () => ({
    viewPub:   Buffer.from(identity.viewPub).toString('hex'),
    spendPub:  Buffer.from(identity.spendPub).toString('hex'),
    noisePub:  Buffer.from(identity.noisePub).toString('hex'),
  }))

  ipcMain.handle('weave:resolve', async (_e, label: string) => {
    return idMgr.resolveHandle(label)
  })

  ipcMain.handle('weave:notifications:poll', async () => {
    return idMgr.pollNotificationLog(identity.spendPub)
  })

  ipcMain.handle('weave:dht:announce', (_e, onionAddress: string) => {
    if (!/^[a-z2-7]{56}\.onion$/.test(onionAddress)) return
    dht.announce(identity.viewPriv, identity.viewPub, onionAddress)
  })

  // Lookup can only decrypt records for the local identity (DHT values are encrypted to our viewPub).
  ipcMain.handle('weave:dht:lookup', async () => {
    return new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000)
      dht.lookup(identity.viewPriv, (onion) => {
        clearTimeout(timer)
        resolve(onion)
      })
    })
  })

  ipcMain.handle('weave:tor:proxy', () => tor.getSocksProxy())

  // ── WebRTC call signaling via Nostr ─────────────────────────────────────────
  // Send a signaling message (offer / answer / ICE candidate) to a peer via
  // NIP-59 gift-wrap so it is end-to-end encrypted and unlinkable.
  ipcMain.handle('weave:call:signal', async (
    _e,
    { recipientLabel, signal }: { recipientLabel: string; signal: object },
  ) => {
    try {
      const resolved = await idMgr.resolveHandle(recipientLabel)
      if (!resolved?.nostrPub) return { ok: false, reason: 'peer not found' }
      const payload = JSON.stringify({ type: 'weave-call-signal', signal })
      await nostr.send(identity.viewPriv, resolved.nostrPub, payload)
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: String(err) }
    }
  })

  // Subscribe to incoming call signals and push them to the renderer.
  // Uses identity.viewPriv as the Nostr receive key (secp256k1 — same as send).
  nostr.subscribe(identity.viewPriv, (from, content) => {
    try {
      const parsed = JSON.parse(content) as { type?: string; signal?: object }
      if (parsed.type === 'weave-call-signal' && parsed.signal) {
        win.webContents.send('weave:call:signal', { from, signal: parsed.signal })
      }
    } catch { /* not a call signal — ignore */ }
  })

  ipcMain.handle('weave:stealth:compute', (_e, viewPubHex: string, spendPubHex: string) => {
    const ephPriv = new Uint8Array(32)
    crypto.getRandomValues(ephPriv)
    return computeStealthAddress(
      { viewPub: Buffer.from(viewPubHex, 'hex'), spendPub: Buffer.from(spendPubHex, 'hex') },
      ephPriv,
    )
  })

  ipcMain.handle('weave:identity:generate-seed', () => {
    return { seedPhrase: generateSeedPhrase() }
  })

  ipcMain.handle('weave:identity:derive-address', (_e, seedPhrase: string[]) => {
    try {
      const { ethAddress } = deriveKeysFromSeed(seedPhrase)
      return { ethAddress }
    } catch {
      return { error: 'Failed to derive address' }
    }
  })

  ipcMain.handle('weave:identity:save', (_e, data: { handle: string, seedPhrase: string[], keys: object }) => {
    try {
      saveIdentity(data)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('weave:identity:load', () => {
    return loadIdentity()
  })

  ipcMain.handle('weave:org:create', async (_e, { orgName, seedPhrase }: { orgName: string, seedPhrase: string[] }) => {
    try {
      const { identity: orgIdentity, ethPrivKey, ethAddress } = deriveKeysFromSeed(seedPhrase)
      const account = privateKeyToAccount(ethPrivKey)
      const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(SEPOLIA_RPC),
      })
      const toHex = (b: Uint8Array): `0x${string}` => `0x${Buffer.from(b).toString('hex')}`
      const weaveIdentityArg = {
        stealthViewKey:  toHex(orgIdentity.viewPub),
        stealthSpendKey: toHex(orgIdentity.spendPub),
        x25519Pubkey:    toHex(orgIdentity.noisePub),
        onionAddress:    '0x' as `0x${string}`,
        nostrPubkey:     `0x${'00'.repeat(32)}` as `0x${string}`,
        registeredAt:    BigInt(Math.floor(Date.now() / 1000)),
      }
      const txHash = await walletClient.writeContract({
        address: ADDRESSES.WeaveRegistrar,
        abi: REGISTRAR_ABI,
        functionName: 'registerOrg',
        args: [orgName, ethAddress, weaveIdentityArg],
      })
      const pubClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })
      await pubClient.waitForTransactionReceipt({ hash: txHash })
      const ensName = `${orgName}.weave.eth`
      const adminEns = `admin.${orgName}.weave.eth`
      saveIdentity({ handle: adminEns, seedPhrase, ethAddress, keys: {
        viewPub: Buffer.from(orgIdentity.viewPub).toString('hex'),
        spendPub: Buffer.from(orgIdentity.spendPub).toString('hex'),
        noisePub: Buffer.from(orgIdentity.noisePub).toString('hex'),
      }})
      return { ensName, adminEns, txHash }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { error: msg }
    }
  })

  ipcMain.handle('weave:member:enroll', async (_e, { orgName, memberName, memberAddress, memberSeedPhrase }: { orgName: string, memberName: string, memberAddress: string, memberSeedPhrase?: string[] }) => {
    try {
      const saved = loadIdentity() as Record<string, unknown> | null
      const savedHandle = saved?.handle as string | undefined
      const savedOrgName = savedHandle?.startsWith('admin.') ? savedHandle.split('.')[1] : null
      if (!saved || !savedOrgName) {
        return { error: 'Must be logged in as org admin to enroll members' }
      }
      if (savedOrgName !== orgName) {
        return { error: `Logged-in admin is for org "${savedOrgName}", not "${orgName}"` }
      }
      const adminSeed = saved.seedPhrase as string[]
      const { ethPrivKey } = deriveKeysFromSeed(adminSeed)
      const account = privateKeyToAccount(ethPrivKey)
      const walletClient = createWalletClient({ account, chain: sepolia, transport: http(SEPOLIA_RPC) })
      const toHex = (b: Uint8Array): `0x${string}` => `0x${Buffer.from(b).toString('hex')}`
      type ViemIdentityArg = {
        stealthViewKey: `0x${string}`; stealthSpendKey: `0x${string}`; x25519Pubkey: `0x${string}`;
        onionAddress: `0x${string}`; nostrPubkey: `0x${string}`; registeredAt: bigint
      }
      let memberIdentityArg: ViemIdentityArg
      if (memberSeedPhrase && memberSeedPhrase.length === 12) {
        const { identity: mi } = deriveKeysFromSeed(memberSeedPhrase)
        memberIdentityArg = {
          stealthViewKey: toHex(mi.viewPub), stealthSpendKey: toHex(mi.spendPub),
          x25519Pubkey: toHex(mi.noisePub),
          onionAddress: '0x' as `0x${string}`, nostrPubkey: `0x${'00'.repeat(32)}` as `0x${string}`,
          registeredAt: BigInt(Math.floor(Date.now() / 1000)),
        }
      } else {
        memberIdentityArg = {
          stealthViewKey: `0x${'00'.repeat(33)}` as `0x${string}`,
          stealthSpendKey: `0x${'00'.repeat(33)}` as `0x${string}`,
          x25519Pubkey: `0x${'00'.repeat(32)}` as `0x${string}`,
          onionAddress: '0x' as `0x${string}`,
          nostrPubkey: `0x${'00'.repeat(32)}` as `0x${string}`,
          registeredAt: BigInt(0),
        }
      }
      const txHash = await walletClient.writeContract({
        address: ADDRESSES.WeaveRegistrar,
        abi: REGISTRAR_ABI,
        functionName: 'enrollMember',
        args: [orgName, memberName, memberAddress as `0x${string}`, memberIdentityArg],
      })
      const pubClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })
      await pubClient.waitForTransactionReceipt({ hash: txHash })
      const existing = loadLocalMembers(orgName)
      const addr = (memberAddress as string).toLowerCase()
      if (!existing.some(m => m.address === addr)) {
        existing.push({ name: `${memberName}.${orgName}.weave.eth`, address: addr })
        saveLocalMembers(orgName, existing)
      }
      return { ensName: `${memberName}.${orgName}.weave.eth`, txHash }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { error: msg }
    }
  })

  ipcMain.handle('weave:member:list', async (_e, orgName: string) => {
    return fetchMembersFromChain(orgName)
  })

  ipcMain.handle('weave:identity:login', async (_e, { handle, seedPhrase }: { handle: string, seedPhrase: string[] }) => {
    try {
      const resolved = await idMgr.resolveHandle(handle)
      if (!resolved) {
        return { success: false, error: "Handle not found on-chain" }
      }
      const { identity: derived } = deriveKeysFromSeed(seedPhrase)
      const derivedViewPub = Buffer.from(derived.viewPub).toString('hex')
      const resolvedViewPub = Buffer.from(resolved.viewPub).toString('hex')
      if (derivedViewPub !== resolvedViewPub) {
        return { success: false, error: "Seed phrase does not match enrolled identity" }
      }
      const loginData = {
        handle,
        seedPhrase,
        keys: {
          viewPub:  Buffer.from(derived.viewPub).toString('hex'),
          spendPub: Buffer.from(derived.spendPub).toString('hex'),
          noisePub: Buffer.from(derived.noisePub).toString('hex'),
        },
      }
      saveIdentity(loginData)
      return { success: true, identity: loginData }
    } catch {
      return { success: false, error: "Handle not enrolled or keys don't match" }
    }
  })

  // ── Arkiv: channel key management ──────────────────────────────────────────

  ipcMain.handle('weave:arkiv:storeChannelKey', async (_e, {
    org, channel, recipient, keyVersion, K_channel, recipientNoisePub,
  }: {
    org: string; channel: string; recipient: string
    keyVersion: number; K_channel: string; recipientNoisePub: string
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return { ok: false, reason: 'disabled' }
    await arkiv.storeChannelKey(
      org, channel, recipient, keyVersion,
      Buffer.from(K_channel, 'hex'),
      Buffer.from(recipientNoisePub, 'hex'),
      identity.noisePriv,
    )
    return { ok: true }
  })

  ipcMain.handle('weave:arkiv:fetchChannelKey', async (_e, {
    org, channel, recipientLabel, keyVersion,
  }: {
    org: string; channel: string; recipientLabel: string; keyVersion: number
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return null
    const key = await arkiv.fetchChannelKey(org, channel, recipientLabel, keyVersion, identity.noisePriv)
    return key ? Buffer.from(key).toString('hex') : null
  })

  ipcMain.handle('weave:arkiv:getLatestKeyVersion', async (_e, {
    org, channel, recipientLabel,
  }: {
    org: string; channel: string; recipientLabel: string
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return -1
    return arkiv.getLatestKeyVersion(org, channel, recipientLabel)
  })

  ipcMain.handle('weave:arkiv:rotateChannelKey', async (_e, {
    org, channel, members,
  }: {
    org: string
    channel: string
    members: { label: string; noisePub: string }[]
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return { ok: false, reason: 'disabled' }
    const newKey     = deriveChannelKey()
    const firstLabel = members[0]?.label ?? ''
    const currentVer = await arkiv.getLatestKeyVersion(org, channel, firstLabel)
    const newVersion = currentVer + 1
    await Promise.all(members.map(m =>
      arkiv.storeChannelKey(
        org, channel, m.label, newVersion,
        newKey,
        Buffer.from(m.noisePub, 'hex'),
        identity.noisePriv,
      ),
    ))
    return newVersion
  })

  // ── Arkiv: message storage ──────────────────────────────────────────────────

  ipcMain.handle('weave:arkiv:postMessage', async (_e, {
    org, channel, keyVersion, text, expiryDays,
  }: {
    org: string; channel: string; keyVersion: number; text: string; expiryDays?: number
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return { ok: false, reason: 'disabled' }
    const saved      = loadIdentity() as { handle?: string } | null
    const myLabel    = saved?.handle ?? ''
    const K_channel  = await arkiv.fetchChannelKey(org, channel, myLabel, keyVersion, identity.noisePriv)
    if (!K_channel) throw new Error('No channel key — not a member or key not fetched yet')
    const senderLabel = saved?.handle ?? 'unknown'
    return arkiv.postMessage(org, channel, senderLabel, K_channel, keyVersion, text, expiryDays)
  })

  ipcMain.handle('weave:arkiv:fetchMessages', async (_e, {
    org, channel, sinceTimestamp, keyVersion,
  }: {
    org: string; channel: string; sinceTimestamp: number; keyVersion: number
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return []
    const saved     = loadIdentity() as { handle?: string } | null
    const myLabel   = saved?.handle ?? ''
    const K_channel = await arkiv.fetchChannelKey(org, channel, myLabel, keyVersion, identity.noisePriv)
    if (!K_channel) return []
    return arkiv.fetchMessages(org, channel, sinceTimestamp, K_channel)
  })

  // ── Arkiv: DM storage ───────────────────────────────────────────────────────

  ipcMain.handle('weave:arkiv:postDM', async (_e, {
    org, recipientLabel, text, expiryDays,
  }: {
    org: string; recipientLabel: string; text: string; expiryDays?: number
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return { ok: false, reason: 'disabled' }
    const saved       = loadIdentity() as { handle?: string } | null
    const senderLabel = saved?.handle ?? ''
    const peerIdentity = await idMgr.resolveHandle(recipientLabel)
    if (!peerIdentity) throw new Error(`Cannot resolve ${recipientLabel}`)
    return arkiv.postDM(
      org, senderLabel, recipientLabel,
      identity.noisePriv, peerIdentity.noisePub,
      text, expiryDays,
    )
  })

  ipcMain.handle('weave:arkiv:fetchDMs', async (_e, {
    org, peerLabel, sinceTimestamp,
  }: {
    org: string; peerLabel: string; sinceTimestamp: number
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return []
    const saved       = loadIdentity() as { handle?: string } | null
    const myLabel     = saved?.handle ?? ''
    const peerIdentity = await idMgr.resolveHandle(peerLabel)
    if (!peerIdentity) return []
    return arkiv.fetchDMs(
      org, myLabel, peerLabel, sinceTimestamp,
      identity.noisePriv, peerIdentity.noisePub,
    )
  })

  // ── Arkiv: membership ───────────────────────────────────────────────────────

  ipcMain.handle('weave:arkiv:addChannelMember', async (_e, {
    org, channel, member, role,
  }: {
    org: string; channel: string; member: string; role: 'admin' | 'member'
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return { ok: false, reason: 'disabled' }
    await arkiv.addChannelMember(org, channel, member, role)
    return { ok: true }
  })

  ipcMain.handle('weave:arkiv:listChannelMembers', async (_e, {
    org, channel,
  }: {
    org: string; channel: string
  }) => {
    if (!ARKIV_ENABLED || !arkiv) return []
    return arkiv.listChannelMembers(org, channel)
  })

  // ── Chat: send DM (Tor → Nostr → Arkiv fallback) ───────────────────────────

  ipcMain.handle('weave:chat:sendDM', async (_e, {
    org, peerLabel, text,
  }: {
    org: string; peerLabel: string; text: string
  }) => {
    const saved       = loadIdentity() as { handle?: string } | null
    const senderLabel = saved?.handle ?? ''

    // Resolve peer identity (ENS)
    const peerIdentity = await idMgr.resolveHandle(peerLabel).catch(() => null)

    let via: 'tor' | 'nostr' | 'arkiv-only' = 'arkiv-only'

    // 1. Try Tor direct HTTP via SOCKS5
    if (peerIdentity?.onionAddress) {
      try {
        const proxy   = tor.getSocksProxy()
        const onion   = peerIdentity.onionAddress.replace(/\.onion$/, '') + '.onion'
        const payload = JSON.stringify({ from: senderLabel, text, timestamp: Date.now() })
        await _sendOverSocks5(proxy.host, proxy.port, onion, 80, payload)
        via = 'tor'
      } catch {
        // Tor failed — fall through to Nostr
      }
    }

    // 2. Fall back to Nostr NIP-59 gift-wrap
    if (via !== 'tor' && peerIdentity?.nostrPub) {
      try {
        // spendPriv is secp256k1 — usable as a Nostr private key
        const recipientNpub = peerIdentity.nostrPub.startsWith('npub1')
          ? peerIdentity.nostrPub
          : npubEncode(peerIdentity.nostrPub.replace(/^0x/, ''))
        // Skip if pubkey is all-zeros placeholder
        const isPlaceholder = /^(npub1[q]+|0{64}|0x0{64})$/.test(recipientNpub)
        if (!isPlaceholder) {
          await nostr.send(identity.spendPriv, recipientNpub, text)
          via = 'nostr'
        }
      } catch {
        // Nostr failed — Arkiv only
      }
    }

    // 3. Always persist in Arkiv for offline delivery
    if (ARKIV_ENABLED && arkiv && peerIdentity) {
      await arkiv.postDM(org, senderLabel, peerLabel, identity.noisePriv, peerIdentity.noisePub, text).catch(() => {})
    }

    return { ok: true, via }
  })

    // ── Teams + Channels persistence (local JSON — Arkiv when SDK ships) ────────

  ipcMain.handle('weave:teams:load', (_e, orgName: string) => {
    return loadTeams(orgName)
  })

  ipcMain.handle('weave:teams:save', (_e, { orgName, teams }: { orgName: string; teams: StoredTeam[] }) => {
    saveTeams(orgName, teams)
    return { ok: true }
  })

  ipcMain.handle('weave:teams:createChannel', (_e, {
    orgName, teamId, channel,
  }: {
    orgName: string
    teamId: string
    channel: { id: string; name: string; kind: string; unread: number; desc: string }
  }) => {
    const teams = loadTeams(orgName)
    const idx = teams.findIndex(t => t.id === teamId)
    if (idx < 0) return { ok: false, error: 'team not found' }
    if (!teams[idx].channels.find(c => c.id === channel.id)) {
      teams[idx].channels.push(channel)
      saveTeams(orgName, teams)
    }
    return { ok: true }
  })

  ipcMain.handle('weave:teams:createTeam', (_e, {
    orgName, team,
  }: {
    orgName: string
    team: StoredTeam
  }) => {
    const teams = loadTeams(orgName)
    if (!teams.find(t => t.id === team.id)) {
      teams.push(team)
      saveTeams(orgName, teams)
    }
    return { ok: true }
  })

  // ── DM order persistence ──────────────────────────────────────────────────

  ipcMain.handle('weave:dm:list', (_e, orgName: string) => {
    return loadDMOrder(orgName)
  })

  ipcMain.handle('weave:dm:open', (_e, { orgName, peerLabel }: { orgName: string; peerLabel: string }) => {
    const order = loadDMOrder(orgName)
    if (!order.includes(peerLabel)) {
      order.unshift(peerLabel)
      saveDMOrder(orgName, order)
    }
    return { ok: true, order }
  })

// ── Chat: subscribe Nostr for incoming DMs, push to renderer ───────────────

  const _nostrUnsub = nostr.subscribe(identity.spendPriv, (from, content) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('weave:dm:received', { from, content })
    }
  })

  app.on('before-quit', () => { _nostrUnsub() })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Send a plain HTTP POST through a SOCKS5 proxy to an onion (or any) host.
 * Uses only Node.js built-in `net` — no extra packages required.
 */
function _sendOverSocks5(
  proxyHost: string,
  proxyPort: number,
  targetHost: string,
  targetPort: number,
  body: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const net = require('net') as typeof import('net')
    const socket = net.connect(proxyPort, proxyHost, () => {
      // SOCKS5 greeting: version 5, 1 auth method: no-auth (0x00)
      socket.write(Buffer.from([0x05, 0x01, 0x00]))
    })

    let step = 0
    socket.on('data', (chunk: Buffer) => {
      if (step === 0) {
        // Server chose no-auth
        if (chunk[0] !== 0x05 || chunk[1] !== 0x00) {
          socket.destroy(); reject(new Error('SOCKS5 auth rejected')); return
        }
        step = 1
        // SOCKS5 CONNECT request (ATYP 0x03 = domain name)
        const host    = Buffer.from(targetHost)
        const portBuf = Buffer.alloc(2); portBuf.writeUInt16BE(targetPort)
        socket.write(Buffer.concat([
          Buffer.from([0x05, 0x01, 0x00, 0x03, host.length]),
          host,
          portBuf,
        ]))
      } else if (step === 1) {
        if (chunk[1] !== 0x00) {
          socket.destroy(); reject(new Error(`SOCKS5 connect failed: ${chunk[1]}`)); return
        }
        step = 2
        // Send HTTP POST
        const req = [
          `POST /receive HTTP/1.1`,
          `Host: ${targetHost}`,
          `Content-Type: application/json`,
          `Content-Length: ${Buffer.byteLength(body)}`,
          `Connection: close`,
          ``,
          body,
        ].join('\r\n')
        socket.write(req)
      } else if (step === 2) {
        const status = chunk.toString('utf8', 0, 15)
        socket.destroy()
        if (status.includes('200') || status.includes('201') || status.includes('204')) {
          resolve()
        } else {
          reject(new Error(`Peer returned: ${status.trim()}`))
        }
      }
    })

    socket.setTimeout(8000, () => { socket.destroy(); reject(new Error('SOCKS5 timeout')) })
    socket.on('error', reject)
  })
}
