import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AddDisaster() {
  const [form, setForm] = useState({
    type: "",
    district: "",
    affectedPopulation: "",
    damages: "",
    needs: "",
    severity: "medium"
  });

  const navigate = useNavigate();
  const token = localStorage.getItem("dmisToken");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post("http://localhost:5000/api/disasters", form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      alert("Disaster reported successfully!");
      navigate("/dashboard");
    } catch (error) {
      alert("Error submitting disaster");
      console.error(error);
    }
  };

  return (
    <div className="form-container">
      <h2>Report Disaster</h2>

      <form onSubmit={handleSubmit}>
        <label>
          Type <span className="required-asterisk">*</span>
          <input name="type" onChange={handleChange} required />
        </label>
        <label>
          District <span className="required-asterisk">*</span>
          <input name="district" onChange={handleChange} required />
        </label>
        <label>
          Affected Population <span className="required-asterisk">*</span>
          <input name="affectedPopulation" type="number" onChange={handleChange} required />
        </label>
        <label>
          Damages
          <input name="damages" onChange={handleChange} required />
        </label>
        <label>
          Needs <span className="required-asterisk">*</span>
          <input name="needs" onChange={handleChange} required />
        </label>

        <label>
          Severity <span className="required-asterisk">*</span>
          <select name="severity" onChange={handleChange}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          </select>
        </label>

        <button type="submit">Submit Disaster</button>
      </form>
    </div>
  );
}

export default AddDisaster;
