import { ipcMain, app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'
import { randomBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { secp256k1 } from '@noble/curves/secp256k1'
import { x25519 } from '@noble/curves/ed25519'
import { createWalletClient, createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { TorManager } from './tor-manager.js'
import { DHTDiscovery } from './dht-discovery.js'
import { NostrDelivery } from './nostr-delivery.js'
import { IdentityManager, createIdentity, WeaveIdentity } from './identity-manager.js'
import { computeStealthAddress } from './crypto/stealth-address.js'
import { ADDRESSES, SEPOLIA_RPC } from './addresses.js'

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
      return { ensName: `${memberName}.${orgName}.weave.eth`, txHash }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { error: msg }
    }
  })

  ipcMain.handle('weave:member:list', async (_e, orgName: string) => {
    try {
      const pubClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })
      const events = await pubClient.getLogs({
        address: ADDRESSES.WeavePermissionedRegistry,
        event: {
          name: 'SubnameRegistered',
          type: 'event',
          inputs: [
            { name: 'labelHash', type: 'bytes32', indexed: true },
            { name: 'owner_', type: 'address', indexed: true },
            { name: 'expiry', type: 'uint64', indexed: false },
          ],
        } as const,
        fromBlock: 0n,
      })
      const members: Array<{ name: string; address: string }> = []
      for (const ev of events) {
        const owner = ev.args.owner_ as string | undefined
        if (!owner) continue
        const addr = owner.toLowerCase()
        if (!members.some(m => m.address === addr)) {
          members.push({ name: `member.${orgName}.weave.eth`, address: addr })
        }
      }
      return members
    } catch {
      return []
    }
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
}
