class SnapshotManager {
  snapshot = {}

  async take() {
    const id = await this._takeSnapshot()
    this.snapshot = id
  }

  async revert() {
    await this._revertSnapshot(this.snapshot)
    this.snapshot = await this._takeSnapshot()
  }

  async _takeSnapshot() {
    return await network.provider.request({
      method: 'evm_snapshot',
      params: [],
    })
  }

  async _revertSnapshot(_id) {
    await network.provider.request({
      method: 'evm_revert',
      params: [_id],
    })
  }
}

module.exports.snapshot = new SnapshotManager()
