const { use, expect } = require('chai')
const { ethers } = require('hardhat')
const { solidity } = require('ethereum-waffle')

use(solidity)

let promoteModule, lensHub, creator, influencer, governance, creatorProfileId

const LENS_HUB_ADDRESS = '0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d'
const INTERACTION_LOGIC_ADDRESS = '0xb05BAe098D2b0E3048DE27F1931E50b0200a043B'
const PROFILE_TOKEN_URI_LOGIC_ADDRESS = '0x3FA902A571E941dCAc6081d57917994DDB0F9A9d'
const PUBLISHING_LOGIC_ADDRESS = '0x7f9bfF8493F821111741b93429A6A6F79DC546F0'
const MOCK_URI = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
const INFLUENCER_ADDRESS = '0x2E21f5d32841cf8C7da805185A041400bF15f21A'
const INFLUENCER_PROFILE_ID = 5
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const FREE_COLLECT_MODULE_ADDRESS = '0x23b9467334bEb345aAa6fd1545538F3d54436e96'
const GOVERNANCE_ADDRESS = '0xf94b90bbeee30996019babd12cecddccf68331de'
const MOCK_PROFILE_HANDLE = 'plant1ghost.eth'
const MOCK_PROFILE_URI = 'https://ipfs.io/ipfs/Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu'
const MOCK_FOLLOW_NFT_URI = 'https://ipfs.fleek.co/ipfs/ghostplantghostplantghostplantghostplantghostplantghostplan'
const WMATIC_ADDRESS = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'

describe('PromoteModule', () => {
  before(async () => {
    const PromoteModule = await ethers.getContractFactory('PromoteModule')
    const ERC20 = await ethers.getContractFactory('ERC20')
    const LensHub = await ethers.getContractFactory('LensHub', {
      libraries: {
        InteractionLogic: INTERACTION_LOGIC_ADDRESS,
        ProfileTokenURILogic: PROFILE_TOKEN_URI_LOGIC_ADDRESS,
        PublishingLogic: PUBLISHING_LOGIC_ADDRESS,
      },
    })

    const signers = await ethers.getSigners()
    creator = signers[0]

    promoteModule = await PromoteModule.deploy(LENS_HUB_ADDRESS)
    lensHub = await LensHub.attach(LENS_HUB_ADDRESS)
    wmatic = await ERC20.attach(WMATIC_ADDRESS)
    influencer = await ethers.getImpersonatedSigner(INFLUENCER_ADDRESS)
    governance = await ethers.getImpersonatedSigner(GOVERNANCE_ADDRESS)
    zero = await ethers.getImpersonatedSigner(ZERO_ADDRESS)

    await zero.sendTransaction({
      to: governance.address,
      value: ethers.utils.parseEther('10'),
    })

    await zero.sendTransaction({
      to: creator.address,
      value: ethers.utils.parseEther('50'),
    })

    await lensHub.connect(governance).whitelistReferenceModule(promoteModule.address, true)
    await lensHub.connect(governance).whitelistProfileCreator(creator.address, true)

    await lensHub.connect(creator).createProfile({
      to: creator.address,
      handle: MOCK_PROFILE_HANDLE,
      imageURI: MOCK_PROFILE_URI,
      followModule: ZERO_ADDRESS,
      followModuleInitData: [],
      followNFTURI: MOCK_FOLLOW_NFT_URI,
    })

    creatorProfileId = await lensHub.getProfileIdByHandle(MOCK_PROFILE_HANDLE)

    await creator.sendTransaction({
      to: WMATIC_ADDRESS,
      value: ethers.utils.parseEther('10'),
    })
  })

  it('should be able to promote a publication', async () => {
    const amount = ethers.utils.parseEther('1')
    await wmatic.connect(creator).approve(promoteModule.address, amount)
    await expect(
      lensHub.connect(creator).post({
        profileId: creatorProfileId,
        contentURI: MOCK_URI,
        collectModule: FREE_COLLECT_MODULE_ADDRESS,
        collectModuleInitData: ethers.utils.defaultAbiCoder.encode(['bool'], [true]),
        referenceModule: promoteModule.address,
        referenceModuleInitData: ethers.utils.defaultAbiCoder.encode(
          ['address', 'uint256', 'uint256', 'uint64'],
          [WMATIC_ADDRESS, amount, INFLUENCER_PROFILE_ID, parseInt(new Date().getTime() / 1000) * 60 * 60 * 2]
        ),
      })
    ).to.emit(promoteModule, 'Promoted')
  })

  it('should be able to collect a reward', async () => {
    const balancePre = await wmatic.balanceOf(INFLUENCER_ADDRESS)
    const amount = ethers.utils.parseEther('1')
    await wmatic.connect(creator).approve(promoteModule.address, amount)
    await lensHub.connect(creator).post({
      profileId: creatorProfileId,
      contentURI: MOCK_URI,
      collectModule: FREE_COLLECT_MODULE_ADDRESS,
      collectModuleInitData: ethers.utils.defaultAbiCoder.encode(['bool'], [true]),
      referenceModule: promoteModule.address,
      referenceModuleInitData: ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'uint64'],
        [WMATIC_ADDRESS, amount, INFLUENCER_PROFILE_ID, parseInt(new Date().getTime() / 1000) * 60 * 60 * 2]
      ),
    })

    await expect(
      lensHub.connect(influencer).mirror({
        profileId: INFLUENCER_PROFILE_ID,
        profileIdPointed: creatorProfileId,
        pubIdPointed: 2,
        referenceModule: ZERO_ADDRESS,
        referenceModuleInitData: [],
        referenceModuleData: [],
      })
    ).to.emit(promoteModule, 'RewardCollected')

    const balancePost = await wmatic.balanceOf(INFLUENCER_ADDRESS)
    expect(balancePost).to.be.eq(balancePre.add(amount))
  })

  it('should not be able to collect a reward twice', async () => {
    const amount = ethers.utils.parseEther('1')
    await wmatic.connect(creator).approve(promoteModule.address, amount)
    await lensHub.connect(creator).post({
      profileId: creatorProfileId,
      contentURI: MOCK_URI,
      collectModule: FREE_COLLECT_MODULE_ADDRESS,
      collectModuleInitData: ethers.utils.defaultAbiCoder.encode(['bool'], [true]),
      referenceModule: promoteModule.address,
      referenceModuleInitData: ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'uint64'],
        [WMATIC_ADDRESS, amount, INFLUENCER_PROFILE_ID, parseInt(new Date().getTime() / 1000) * 60 * 60 * 2]
      ),
    })

    await expect(
      lensHub.connect(influencer).mirror({
        profileId: INFLUENCER_PROFILE_ID,
        profileIdPointed: creatorProfileId,
        pubIdPointed: 3,
        referenceModule: ZERO_ADDRESS,
        referenceModuleInitData: [],
        referenceModuleData: [],
      })
    ).to.emit(promoteModule, 'RewardCollected')

    await expect(
      lensHub.connect(influencer).mirror({
        profileId: INFLUENCER_PROFILE_ID,
        profileIdPointed: creatorProfileId,
        pubIdPointed: 3,
        referenceModule: ZERO_ADDRESS,
        referenceModuleInitData: [],
        referenceModuleData: [],
      })
    ).to.not.emit(promoteModule, 'RewardCollected')
  })

  it('should not be able to collect a reward if it is expired', async () => {
    const amount = ethers.utils.parseEther('1')
    const timestamp = parseInt(new Date().getTime() / 1000)
    await wmatic.connect(creator).approve(promoteModule.address, amount)
    await lensHub.connect(creator).post({
      profileId: creatorProfileId,
      contentURI: MOCK_URI,
      collectModule: FREE_COLLECT_MODULE_ADDRESS,
      collectModuleInitData: ethers.utils.defaultAbiCoder.encode(['bool'], [true]),
      referenceModule: promoteModule.address,
      referenceModuleInitData: ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'uint64'],
        [WMATIC_ADDRESS, amount, INFLUENCER_PROFILE_ID, timestamp]
      ),
    })

    await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp + 1000])
    await ethers.provider.send('evm_mine')

    await expect(
      lensHub.connect(influencer).mirror({
        profileId: INFLUENCER_PROFILE_ID,
        profileIdPointed: creatorProfileId,
        pubIdPointed: 4,
        referenceModule: ZERO_ADDRESS,
        referenceModuleInitData: [],
        referenceModuleData: [],
      })
    ).to.not.emit(promoteModule, 'RewardCollected')
  })
})
