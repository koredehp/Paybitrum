import { useState, useEffect } from 'react'
import {
  useAccount, useConnect, useDisconnect, useSwitchChain,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { parseUnits, formatUnits, isAddress } from 'viem'
import { PAYBITRUM_ADDRESS, USDC_ADDRESS, paybitrumAbi, erc20Abi } from './contracts'
import EscrowManager from './EscrowManager'
import './App.css'

function toUnits(value: string): bigint | null {
  try {
    const v = parseUnits(value, 6)
    return v > 0n ? v : null
  } catch {
    return null
  }
}

export default function App() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const [freelancer, setFreelancer] = useState('')
  const [amount, setAmount] = useState('100')
  const [days, setDays] = useState('3')

  const wrongNetwork = isConnected && chainId !== arbitrumSepolia.id
  const ready = isConnected && !wrongNetwork

  const balance = useReadContract({
    address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined, query: { enabled: ready },
  })
  const allowance = useReadContract({
    address: USDC_ADDRESS, abi: erc20Abi, functionName: 'allowance',
    args: address ? [address, PAYBITRUM_ADDRESS] : undefined, query: { enabled: ready },
  })
  const count = useReadContract({
    address: PAYBITRUM_ADDRESS, abi: paybitrumAbi, functionName: 'escrowCount',
    query: { enabled: ready },
  })

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (receipt.isSuccess) {
      balance.refetch()
      allowance.refetch()
      count.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess])

  const amountUnits = toUnits(amount)
  const daysNum = Number(days)
  const formOk = isAddress(freelancer) && amountUnits !== null && daysNum > 0
  const needsApproval = amountUnits !== null && (allowance.data ?? 0n) < amountUnits

  function mint() {
    if (!address) return
    reset()
    writeContract({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'mint',
      args: [address, parseUnits('1000', 6)],
    })
  }

  function approve() {
    if (amountUnits === null) return
    reset()
    writeContract({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve',
      args: [PAYBITRUM_ADDRESS, amountUnits],
    })
  }

  function createEscrow() {
    if (!formOk || amountUnits === null) return
    reset()
    const deadline = BigInt(Math.floor(Date.now() / 1000) + daysNum * 86400)
    writeContract({
      address: PAYBITRUM_ADDRESS, abi: paybitrumAbi, functionName: 'createEscrow',
      args: [freelancer as `0x${string}`, USDC_ADDRESS, amountUnits, deadline],
    })
  }

  const busy = isPending || receipt.isLoading

  return (
    <div className="page">
      <div className="hero">
        <span className="badge">Arbitrum Sepolia · Testnet</span>
        <h1>Paybitrum</h1>
        <p>
          Trustless escrow for remote work. Funds lock on-chain the moment a
          client hires, and release automatically once the work is approved,
          no invoices, no chasing payments, no middleman.
        </p>
      </div>

      <div className="steps">
        <div className="step">
          <div className="num">1</div>
          <h3>Client funds escrow</h3>
          <p>Payment locks in the contract before work starts.</p>
        </div>
        <div className="step">
          <div className="num">2</div>
          <h3>Freelancer delivers</h3>
          <p>Work is submitted on-chain as proof of delivery.</p>
        </div>
        <div className="step">
          <div className="num">3</div>
          <h3>Payment releases</h3>
          <p>Client approves, or the rules release it automatically.</p>
        </div>
      </div>

      <div className="card">
        <h2>Wallet</h2>
        <p className="subtitle">Connect to interact with the live testnet contracts.</p>

        {!isConnected && (
          <button onClick={() => connect({ connector: connectors[0] })}>Connect wallet</button>
        )}

        {isConnected && (
          <div>
            <div className="detail-row">
              <span className="label">Address</span>
              <span className="value">{address}</span>
            </div>
            <div className="detail-row">
              <span className="label">Network</span>
              <span className="value">{wrongNetwork ? 'Unsupported' : 'Arbitrum Sepolia ✓'}</span>
            </div>
            {wrongNetwork && (
              <button onClick={() => switchChain({ chainId: arbitrumSepolia.id })} style={{ marginTop: 12 }}>
                Switch to Arbitrum Sepolia
              </button>
            )}
            <button className="secondary" onClick={() => disconnect()} style={{ marginTop: 12 }}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {ready && (
        <>
          <div className="card">
            <h2>1. Get test USDC</h2>
            <p className="subtitle">Mint free testnet tokens to try the flow.</p>
            <div className="detail-row">
              <span className="label">Your balance</span>
              <span className="value">{balance.data !== undefined ? formatUnits(balance.data, 6) : '...'} mUSDC</span>
            </div>
            <button disabled={busy} onClick={mint} style={{ marginTop: 16 }}>Mint 1,000 test USDC</button>
          </div>

          <div className="card">
            <h2>2. Create an escrow</h2>
            <p className="subtitle">Lock payment for a freelancer before work begins.</p>
            <label>Freelancer address
              <input value={freelancer} placeholder="0x..." onChange={(e) => setFreelancer(e.target.value)} />
            </label>
            <label>Amount (mUSDC)
              <input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label>Deadline (days from now)
              <input value={days} onChange={(e) => setDays(e.target.value)} />
            </label>

            {needsApproval ? (
              <button disabled={busy || !formOk} onClick={approve}>Step A: Approve USDC</button>
            ) : (
              <button disabled={busy || !formOk} onClick={createEscrow}>Step B: Create escrow</button>
            )}

            <div className="detail-row" style={{ marginTop: 16 }}>
              <span className="label">Escrows created so far</span>
              <span className="value">{count.data?.toString() ?? '...'}</span>
            </div>

            {isPending && <p className="pending-text">Confirm in your wallet...</p>}
            {receipt.isLoading && <p className="pending-text">Waiting for confirmation...</p>}
            {receipt.isSuccess && (
              <div className="success-box">
                Done ✓ <a href={`https://sepolia.arbiscan.io/tx/${hash}`} target="_blank" rel="noreferrer">View on Arbiscan</a>
              </div>
            )}
            {error && <div className="error-box">{error.message.split('\n')[0]}</div>}
          </div>

          <div className="card">
            <EscrowManager />
          </div>
        </>
      )}

      <div className="card">
        <h2>Why Paybitrum</h2>
        <p className="subtitle">Built for remote freelance work, where trust is hard to establish and cross-border payments are slow and costly.</p>
        <div className="detail-row"><span className="label">No shared legal system</span><span className="value">Escrow replaces the need for one</span></div>
        <div className="detail-row"><span className="label">Slow bank transfers</span><span className="value">Settlement in seconds on Arbitrum</span></div>
        <div className="detail-row"><span className="label">Client disappears</span><span className="value">Auto-claim after a 7-day review window</span></div>
        <div className="detail-row"><span className="label">Freelancer ghosts</span><span className="value">Client can refund after the deadline</span></div>
      </div>

      <div className="footer-note">
        Deployed on Arbitrum Sepolia testnet. Read the contract source on{' '}
        <a href="https://sepolia.arbiscan.io/address/0x4A4234c59A19685eeDd77f1357e7ff2B33477F76" target="_blank" rel="noreferrer">
          Arbiscan
        </a>.
      </div>
    </div>
  )
}