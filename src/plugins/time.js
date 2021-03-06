const html = require('bel')

module.exports = function(DPicker) {
  const MINUTES = new Array(60).fill(0).map((e, i) => i)
  const HOURS24 = new Array(24).fill(0).map((e, i) => i)
  const HOURS12 = new Array(12).fill(0).map((e, i) => i === 0 ? 12 : i)
  HOURS12.push(HOURS12.shift())
  const MERIDIEM_TOKENS = ['AM', 'PM']

  /**
  * Get hours and minutes according to the given `data` (meridiem, min/max consideration)
  * @param {Object} data
  * @private
  * @return {Object} `{hours, minutes}` both arrays of numbers
  */
  function getHoursMinutes (data) {
    let hours = data.meridiem ? HOURS12 : HOURS24
    const step = parseInt(data.step)
    let minutes = MINUTES.filter(e => e % step === 0)
    const modelHours = DPicker.dateAdapter.getHours(data.model)

    ;[data.min, data.max].map((e, i) => {
      if (!DPicker.dateAdapter.isSameDay(data.model, e)) {
        return
      }

      let xHours = DPicker.dateAdapter.getHours(e)
      let xMinutes = DPicker.dateAdapter.getMinutes(e)
      let x = e

      if (i === 0 && xMinutes + step > 60) {
        x = DPicker.dateAdapter.setMinutes(DPicker.dateAdapter.setHours(x, i === 0 ? ++xHours : --xHours), 0)
        xMinutes = 0
      }

      if (data.meridiem === true) {
        if (xHours > 12) {
          xHours = xHours - 12
        } else if (xHours === 0) {
          xHours = 12
        }
      }

      hours = hours.filter(e => i === 0 ? e >= xHours : e <= xHours)
    })

    return {hours, minutes}
  }

  /**
  * Pad left for minutes \o/
  * @param {Number} v
  * @private
  * @return {String}
  */
  function padLeftZero (v) {
    return v < 10 ? '0' + v : '' + v
  }

  /**
  * Handles minutes steps to focus on the correct input and set the model minutes/hours
  * @private
  */
  function minutesStep () {
    if (!this.data.time || parseInt(this.data.step, 10) <= 1) {
      return
    }

    let {minutes} = getHoursMinutes(this.data)

    let modelMinutes = DPicker.dateAdapter.getMinutes(this.data.model)

    if (modelMinutes < minutes[0]) {
      this.data.model = DPicker.dateAdapter.setMinutes(this.data.model, minutes[0])
      modelMinutes = minutes[0]
    }

    if (modelMinutes > minutes[minutes.length - 1]) {
      this.data.model = DPicker.dateAdapter.setMinutes(DPicker.dateAdapter.addHours(this.data.model, 1), 0)
      return
    }

    minutes[minutes.length] = 60
    modelMinutes = minutes.reduce(function (prev, curr) {
      return (Math.abs(curr - modelMinutes) < Math.abs(prev - modelMinutes) ? curr : prev)
    })

    minutes.length--

    this.data.model = DPicker.dateAdapter.setMinutes(this.data.model, modelMinutes)
  }

  /**
  * Render Time
  * ```
  * select[name='dpicker-hour']
  * select[name='dpicker-minutes']
  * ```
  *
  * @fires DPicker#hoursChange
  * @fires DPicker#minutesChange
  * @fires DPicker#minuteHoursChange
  * @fires DPicker#meridiemChange
  * @return {Element} the rendered virtual dom hierarchy
  */
  DPicker.renders.time = function renderTime (events, data) {
    if (!data.time) { return html`<span style="display: none;" class="dpicker-time"` }

    let modelHours = DPicker.dateAdapter.getHours(data.model)

    if (data.meridiem !== false) {
      modelHours = modelHours > 12 ? modelHours - 12 : modelHours
      modelHours = modelHours === 0 ? 12 : modelHours
    }

    let {hours, minutes} = getHoursMinutes(data)
    const modelMinutes = DPicker.dateAdapter.getMinutes(data.model)
    let selects = []
    let modelStringValue = `${modelHours}:${modelMinutes}`

    const minHours = DPicker.dateAdapter.getHours(data.min)
    const minMinutes = DPicker.dateAdapter.getMinutes(data.min)
    const maxHours = DPicker.dateAdapter.getHours(data.max)
    const maxMinutes = DPicker.dateAdapter.getMinutes(data.max)

    if (data.concatHoursAndMinutes) {
      selects.push(
        html`<select onchange="${events.minuteHoursChange}" name="dpicker-time" aria-label="time">
          ${
            [].concat.apply([], minutes.map(minute => {
              return hours.map(hour => `${hour}:${minute}`)
            }))
            .filter((e) => {
              let hm = e.split(':').map(parseFloat)

              if (DPicker.dateAdapter.isSameDay(data.model, data.min) && hm[0] === minHours && hm[1] < minMinutes) {
                return false
              }

              if (DPicker.dateAdapter.isSameDay(data.model, data.max) && hm[0] === maxHours && hm[1] > maxMinutes) {
                return false
              }

              return true
            })
            .sort((a, b) => {
              a = a.split(':').map(parseFloat)
              b = b.split(':').map(parseFloat)

              if (a[0] < b[0]) {
                return -1
              }

              if (a[0] > b[0]) {
                return 1
              }

              if (a[1] < b[1]) {
                return -1
              }

              if (a[1] > b[1]) {
                return 1
              }

              return 0
            })
            .map((value) => {
              const text = value.split(':').map(padLeftZero).join(':')
              return html`<option ${value === modelStringValue ? 'selected' : ''} value="${value}">${text}</option>`
            })
          }
        </select>`
      )
    } else {
      selects.push(
        html`<select onchange="${events.hoursChange}" name="dpicker-hours" aria-label="Hours">${
          hours.map((e, i) => {
            return html`<option ${e === modelHours ? 'selected' : ''} value="${e}">${padLeftZero(e)}</option>`
          })
        }</select>`,
        html`<select onchange="${events.minutesChange}" name="dpicker-minutes" aria-label="Minutes">${
          minutes.filter((e) => {
            if (DPicker.dateAdapter.isSameDay(data.model, data.min) && modelHours === minHours && e < minMinutes) {
              return false
            }

            if (DPicker.dateAdapter.isSameDay(data.model, data.max) && modelHours === maxHours && e > maxMinutes) {
              return false
            }

            return true
          }).map((e, i) => {
            return html`<option ${e === modelMinutes ? 'selected' : ''} value="${e}">${padLeftZero(e)}</option>`
          })
        }</select>`
      )
    }

    if (data.meridiem !== false) {
      let modelMeridiem = DPicker.dateAdapter.getMeridiem(data.model)
      selects.push(html`<select onchange="${events.meridiemChange}" name="dpicker-meridiem">
        ${MERIDIEM_TOKENS.map(e => {
          return html`<option ${modelMeridiem === e ? 'selected' : ''} value="${e}">${e}</option>`
        })}
      </select>`)
    }

    return html`<span class="dpicker-time">${selects}</span>`
  }

  /**
    * On hours change
    * @event DPicker#hoursChange
    */
  DPicker.events.hoursChange = function hoursChange (evt) {
    this.data.empty = false

    let val = parseInt(evt.target.options[evt.target.selectedIndex].value, 10)

    if (this.data.meridiem !== false) {
      if (DPicker.dateAdapter.getMeridiem(this.data.model) === MERIDIEM_TOKENS[1] /** PM **/) {
        val = val === 12 ? 12 : val + 12
      } else if (val === 12) {
        val = 0
      }
    }

    this.model = DPicker.dateAdapter.setHours(this.data.model, val)
    if (evt.redraw === false) {
      this.redraw()
    }
    this.onChange({modelChanged: true, name: 'hoursChange', event: evt})
  }

  /**
    * On minutes change
    * @event DPicker#minutesChange
    */
  DPicker.events.minutesChange = function minutesChange (evt) {
    this.data.empty = false
    this.model = DPicker.dateAdapter.setMinutes(this.data.model, evt.target.options[evt.target.selectedIndex].value)
    if (evt.redraw === false) {
      this.redraw()
    }
    this.onChange({modelChanged: true, name: 'minutesChange', event: evt})
  }

  /**
    * On minutes hours change when concatHoursAndMinutes is `true`
    * @event DPicker#minuteHoursChange
    */
  DPicker.events.minuteHoursChange = function minuteHoursChange (evt) {
    let val = evt.target.options[evt.target.selectedIndex].value.split(':')

    // whoops, hacked myself
    this.events.hoursChange({target: {options: [{value: val[0]}], selectedIndex: 0}, redraw: false})
    this.events.minutesChange({target: {options: [{value: val[1]}], selectedIndex: 0}, redraw: false})
    this.redraw()
  }

  /**
    * On meridiem change
    * @event DPicker#meridiemChange
    */
  DPicker.events.meridiemChange = function meridiemChange (evt) {
    this.data.empty = false
    let val = evt.target.options[evt.target.selectedIndex].value
    let hours = DPicker.dateAdapter.getHours(this.data.model)

    if (val === MERIDIEM_TOKENS[0] /** AM **/) {
      hours = hours === 12 ? 0 : hours - 12
    } else {
      hours = hours === 12 ? 12 : hours + 12
    }

    this.model = DPicker.dateAdapter.setHours(this.data.model, hours)
    this.redraw()
    this.onChange({modelChanged: true, name: 'meridiemChange', event: evt})
  }

  /**
  * @ignore
  */
  DPicker.events.inputChange = DPicker.decorate(DPicker.events.inputChange, function timeInputChange () {
    minutesStep.apply(this)
  })

  /**
  * @ignore
  */
  DPicker.prototype.initialize = DPicker.decorate(DPicker.prototype.initialize, function timeInitialize () {
    minutesStep.apply(this)
  })

  /**
  * @ignore
  */
  DPicker.prototype.redraw = DPicker.decorate(DPicker.prototype.redraw, function timeRedraw () {
    minutesStep.apply(this)
  })

  /**
  * @property {Boolean} [time=false] If `type="datetime"` attribute is defined, evaluates to `true`
  */
  DPicker.properties.time = function getTimeAttribute (attributes) {
    return attributes.type === 'datetime'
  }

  /**
  * @property {Boolean} [step=1] Takes the value of the attribute `step` or `1`
  */
  DPicker.properties.step = function getStepAttribute (attributes) {
    return attributes.step ? parseInt(attributes.step, 10) : 1
  }

  /**
  * @property {Boolean} [meridiem=false]
  */
  DPicker.properties.meridiem = false

  /**
  * @property {Boolean} [concatHoursAndMinutes=false]
  */
  DPicker.properties.concatHoursAndMinutes = false


  /**
  * ## Time
  *
  * Adds the following options/attributes/getters/setters:
  *
  * - `{boolean} [options.time=false]` Wether to add time or not, defaults to `true` if input type is `datetime`
  * - `{boolean} [options.meridiem=false]` 12 vs 24 time format where 24 is the default, this can be set through the `meridiem` attribute
  * - `{Number} [options.step=1]` Minutes step
  *
  **/

  return DPicker
}
