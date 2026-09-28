export const PAYBITRUM_ADDRESS = '0x4A4234c59A19685eeDd77f1357e7ff2B33477F76' as const
export const USDC_ADDRESS = '0x358f92e74Af2cC5A825d1E5088a709911eAbF1C0' as const

export const erc20Abi = [
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

export const paybitrumAbi = [
  { type: 'function', name: 'createEscrow', stateMutability: 'nonpayable', inputs: [{ name: 'freelancer', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'deadline', type: 'uint64' }], outputs: [{ name: 'id', type: 'uint256' }] },
  { type: 'function', name: 'submitWork', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }, { name: 'workHash', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'release', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'claimAfterReview', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'refund', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'escrowCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const